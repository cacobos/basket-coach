# Seguridad y Privacidad

Versión 1.0

---

## 1. Objetivo

Definir las políticas y mecanismos de seguridad de la aplicación para proteger los datos de entrenadores, equipos y jugadoras.

---

## 2. Principios

- Seguridad por defecto
- Mínimo privilegio
- Validación en servidor
- Datos cifrados en tránsito y reposo
- Auditoría de accesos

---

## 3. Autenticación

### Supabase Auth

La aplicación utiliza Supabase Auth para la autenticación.

Métodos soportados:
- Email + contraseña
- Magic link
- Google OAuth
- Apple OAuth (futuro)

```typescript
async function signIn(email: string, password: string): Promise<void> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  // Redirigir al dashboard
}
```

---

## 4. Autorización

### Row Level Security (RLS)

Todas las tablas tienen RLS activado.

Un usuario solo puede acceder a datos de equipos donde es miembro.

```sql
-- Un usuario ve solo equipos donde es miembro
CREATE POLICY select_teams ON teams
  FOR SELECT USING (
    id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Un usuario inserta posesiones solo en partidos de su equipo
CREATE POLICY insert_possessions ON possessions
  FOR INSERT WITH CHECK (
    match_id IN (
      SELECT m.id FROM matches m
      JOIN team_members tm ON tm.team_id = m.team_id
      WHERE tm.user_id = auth.uid()
    )
  );
```

---

## 5. Roles

| Rol | Permisos |
|-----|----------|
| owner | Administrar equipo, miembros, configuración |
| coach | Gestionar partidos, jugadoras, estadísticas |
| assistant | Registrar posesiones, ver estadísticas |
| scout | Solo lectura + informes de scouting |
| viewer | Solo lectura |

```sql
CREATE TYPE member_role AS ENUM ('owner', 'coach', 'assistant', 'scout', 'viewer');

ALTER TABLE team_members ADD COLUMN role member_role NOT NULL DEFAULT 'viewer';
```

---

## 6. Políticas por rol

```sql
-- Owner: todos los permisos
CREATE POLICY owner_all ON possessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN matches m ON m.team_id = tm.team_id
      WHERE tm.user_id = auth.uid()
        AND tm.role = 'owner'
        AND m.id = possessions.match_id
    )
  );

-- Assistant: solo insertar posesiones
CREATE POLICY assistant_insert ON possessions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN matches m ON m.team_id = tm.team_id
      WHERE tm.user_id = auth.uid()
        AND tm.role IN ('assistant', 'coach', 'owner')
        AND m.id = possessions.match_id
    )
  );

-- Scout: solo lectura
CREATE POLICY scout_select ON possessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN matches m ON m.team_id = tm.team_id
      WHERE tm.user_id = auth.uid()
        AND m.id = possessions.match_id
    )
  );
```

---

## 7. Validación en servidor

Toda validación crítica se realiza en PostgreSQL mediante triggers y constraints.

Nunca confiar únicamente en validación del cliente.

```sql
CREATE OR REPLACE FUNCTION validate_possession_security()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar que el usuario pertenece al equipo del partido
  IF NOT EXISTS (
    SELECT 1 FROM team_members tm
    JOIN matches m ON m.team_id = tm.team_id
    WHERE tm.user_id = auth.uid()
      AND m.id = NEW.match_id
  ) THEN
    RAISE EXCEPTION 'No tienes permisos para modificar posesiones de este partido';
  END IF;

  -- Verificar que el partido no está cerrado
  IF EXISTS (
    SELECT 1 FROM matches
    WHERE id = NEW.match_id AND status = 'closed'
  ) THEN
    RAISE EXCEPTION 'No se pueden modificar posesiones de un partido cerrado';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER check_possession_security
  BEFORE INSERT OR UPDATE ON possessions
  FOR EACH ROW EXECUTE FUNCTION validate_possession_security();
```

---

## 8. Protección de datos personales

### Datos sensibles

- Nombres de jugadoras (especialmente menores)
- Información de contacto
- Datos de salud o lesiones

### Medidas

- Cifrado en reposo (SSL/TLS)
- Acceso por roles
- No almacenar datos innecesarios
- Posibilidad de anonimizar jugadoras
- Política de retención de datos

---

## 9. API Keys y secretos

```typescript
// Configuración de Supabase
const supabaseUrl = environment.supabaseUrl;
const supabaseKey = environment.supabaseAnonKey;

// Las keys de servicio NUNCA se incluyen en el frontend
// Las operaciones delicadas usan Edge Functions
```

---

## 10. Edge Functions para operaciones sensibles

```typescript
// Supabase Edge Function para operaciones administrativas
Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { data: { user }, error } = await supabase.auth.getUser(authHeader);
  if (error || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Verificar rol admin
  const { data: member } = await supabase
    .from('team_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('team_id', params.teamId)
    .single();

  if (member?.role !== 'owner') {
    return new Response('Forbidden', { status: 403 });
  }

  // Ejecutar operación
});
```

---

## 11. Auditoría de seguridad

Todos los accesos importantes se registran:

```sql
CREATE TABLE security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_security_audit_user ON security_audit_log(user_id);
CREATE INDEX idx_security_audit_time ON security_audit_log(created_at DESC);
```

---

## 12. Prevención de inyección SQL

Todas las consultas utilizan Supabase JavaScript SDK, que escapa automáticamente los parámetros.

Prohibido usar `raw` SQL desde el frontend.

```typescript
// ✅ Seguro
const { data } = await supabase
  .from('possessions')
  .select('*')
  .eq('match_id', matchId);

// ❌ Inseguro - No usar
const { data } = await supabase.rpc('execute_sql', {
  query: `SELECT * FROM possessions WHERE match_id = '${matchId}'`,
});
```

---

## 13. HTTPS y cifrado

- Todas las comunicaciones por HTTPS
- Supabase cifra datos en reposo
- Conexiones a Supabase mediante TLS 1.3
- Las claves API nunca se exponen en repositorios

---

## 14. Seguridad en Storage

Los archivos subidos (vídeos, logos) tienen políticas de acceso restringido:

```sql
-- Solo miembros del equipo pueden ver vídeos
CREATE POLICY read_match_videos ON storage.objects
  FOR SELECT USING (
    bucket_id = 'match-videos'
    AND EXISTS (
      SELECT 1 FROM team_members tm
      JOIN matches m ON m.team_id = tm.team_id
      WHERE tm.user_id = auth.uid()
        AND m.id::text = (storage.foldername(name))[1]
    )
  );
```

---

## 15. Checklist de seguridad

- [ ] RLS activado en todas las tablas
- [ ] Políticas por rol implementadas
- [ ] Validación en servidor para operaciones críticas
- [ ] Auditoría de accesos
- [ ] Cifrado en tránsito (HTTPS)
- [ ] No hay secretos en el frontend
- [ ] Las consultas usan SDK, no raw SQL
- [ ] Los Storage buckets tienen políticas
- [ ] Las Edge Functions verifican autenticación
- [ ] Los tokens JWT tienen expiración

---

## Próximo documento

[18-deployment.md](18-deployment.md)
