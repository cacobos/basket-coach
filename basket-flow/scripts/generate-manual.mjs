import { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType, PageBreak, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = join(__dirname, '..', 'screenshots');
const OUTPUT_PATH = join(__dirname, '..', 'manual-usuario-basketflow.docx');

const profiles = [
  {
    name: 'superadmin',
    label: 'Super Admin',
    title: 'Super Administrador',
    description: 'El Super Admin tiene acceso global a todos los clubes, puede gestionar suscripciones, permisos y ver métricas de la plataforma.',
    pages: [
      { name: 'dashboard', title: 'Dashboard' },
      { name: 'panel-superadmin', title: 'Panel Super Admin' },
      { name: 'superadmin-clubs', title: 'Gestión de Clubes' },
      { name: 'superadmin-permissions', title: 'Permisos por Rol' },
      { name: 'equipos', title: 'Equipos' },
      { name: 'jugadores', title: 'Jugadores' },
      { name: 'ejercicios', title: 'Ejercicios' },
      { name: 'sesiones', title: 'Sesiones' },
      { name: 'calendario', title: 'Calendario' },
      { name: 'partidos', title: 'Partidos' },
      { name: 'planificacion', title: 'Planificación' },
    ],
  },
  {
    name: 'club_admin',
    label: 'Club Admin',
    title: 'Administrador de Club',
    description: 'El Club Admin gestiona un club específico: equipos, jugadores, entrenadores, finanzas, documentos y comunicación.',
    pages: [
      { name: 'dashboard', title: 'Dashboard' },
      { name: 'equipos', title: 'Equipos' },
      { name: 'jugadores', title: 'Jugadores' },
      { name: 'ejercicios', title: 'Biblioteca de Ejercicios' },
      { name: 'nuevo-ejercicio', title: 'Crear Ejercicio' },
      { name: 'sesiones', title: 'Sesiones de Entrenamiento' },
      { name: 'calendario', title: 'Calendario' },
      { name: 'partidos', title: 'Partidos' },
      { name: 'documentos', title: 'Documentos y Licencias' },
      { name: 'comunicacion', title: 'Comunicación (Anuncios)' },
      { name: 'nuevo-anuncio', title: 'Nuevo Anuncio' },
      { name: 'finanzas', title: 'Finanzas' },
      { name: 'planes-cuota', title: 'Planes de Cuota' },
      { name: 'planificacion', title: 'Planificación Deportiva' },
      { name: 'pizarra-tactica', title: 'Pizarra Táctica' },
      { name: 'configuracion', title: 'Configuración' },
    ],
  },
  {
    name: 'coach',
    label: 'Coach',
    title: 'Entrenador',
    description: 'El Entrenador tiene acceso a jugadores, ejercicios, sesiones, evaluaciones, pizarra táctica y análisis de partidos.',
    pages: [
      { name: 'dashboard', title: 'Dashboard' },
      { name: 'jugadores', title: 'Jugadores' },
      { name: 'ejercicios', title: 'Biblioteca de Ejercicios' },
      { name: 'sesiones', title: 'Sesiones de Entrenamiento' },
      { name: 'nueva-sesion', title: 'Nueva Sesión' },
      { name: 'calendario', title: 'Calendario' },
      { name: 'partidos', title: 'Partidos' },
      { name: 'evaluaciones', title: 'Evaluaciones' },
      { name: 'pizarra-tactica', title: 'Pizarra Táctica' },
      { name: 'planificacion', title: 'Planificación Deportiva' },
    ],
  },
  {
    name: 'family',
    label: 'Familia',
    title: 'Portal de Familias',
    description: 'Las familias pueden ver la información de sus jugadores: calendario, comunicados y estado de pagos.',
    pages: [
      { name: 'dashboard', title: 'Dashboard' },
      { name: 'portal-familia', title: 'Portal de Familia' },
      { name: 'calendario', title: 'Calendario' },
      { name: 'comunicacion', title: 'Comunicación' },
    ],
  },
];

function imageFromFile(filePath, width, height) {
  if (!existsSync(filePath)) return null;
  const buffer = readFileSync(filePath);
  return new ImageRun({
    data: buffer,
    transformation: { width, height },
    type: 'png',
  });
}

async function generateManual() {
  const children = [];

  // --- PORTADA ---
  children.push(
    new Paragraph({ spacing: { before: 3000 } }),
    new Paragraph({
      children: [new TextRun({ text: 'BasketFlow', size: 56, bold: true, color: '080D3C' })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Manual de Usuario', size: 40, color: '6366F1', bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Plataforma de Entrenamiento de Baloncesto', size: 24, color: '6B7280' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Guía completa para Super Admins, Club Admins, Entrenadores y Familias', size: 22, color: '9CA3AF' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 2000 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Julio 2026', size: 22, color: '9CA3AF' })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // --- ÍNDICE ---
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'Índice', size: 36, bold: true, color: '080D3C' })],
      spacing: { after: 400 },
    }),
  );

  for (const profile of profiles) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `${profile.title}`, size: 24, bold: true, color: '6366F1' })],
        spacing: { before: 200 },
      }),
    );
    for (const page of profile.pages) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `    ${page.title}`, size: 20, color: '374151' })],
          spacing: { before: 60 },
        }),
      );
    }
  }

  children.push(new Paragraph({ children: [new PageBreak()] }));

  // --- INTRODUCCIÓN ---
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'Introducción', size: 36, bold: true, color: '080D3C' })],
      spacing: { after: 300 },
    }),
    new Paragraph({
      children: [new TextRun({
        text: 'BasketFlow es una plataforma integral para la gestión de clubes de baloncesto. ' +
          'Ofrece herramientas para la planificación de entrenamientos, análisis de partidos, ' +
          'gestión de jugadores, comunicación con familias y administración financiera.',
        size: 22,
        color: '374151',
      })],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({
        text: 'Este manual recorre las principales funcionalidades desde la perspectiva de cada perfil de usuario.',
        size: 22,
        color: '374151',
      })],
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Perfiles de usuario:', size: 24, bold: true, color: '080D3C' })],
      spacing: { after: 200 },
    }),
  );

  const profileTableRows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Perfil', bold: true, size: 20 })] })], width: { size: 2500, type: WidthType.DXA } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Email', bold: true, size: 20 })] })], width: { size: 3500, type: WidthType.DXA } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Contraseña', bold: true, size: 20 })] })], width: { size: 2000, type: WidthType.DXA } }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Super Admin', size: 20 })], spacing: { after: 0 } })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'superadmin@basketflow.com', size: 20 })], spacing: { after: 0 } })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '123456', size: 20 })], spacing: { after: 0 } })] }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Club Admin', size: 20 })], spacing: { after: 0 } })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'club_admin@basketflow.com', size: 20 })], spacing: { after: 0 } })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '123456', size: 20 })], spacing: { after: 0 } })] }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Coach', size: 20 })], spacing: { after: 0 } })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'coach@basketflow.com', size: 20 })], spacing: { after: 0 } })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '123456', size: 20 })], spacing: { after: 0 } })] }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Familia', size: 20 })], spacing: { after: 0 } })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'family@basketflow.com', size: 20 })], spacing: { after: 0 } })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '123456', size: 20 })], spacing: { after: 0 } })] }),
      ],
    }),
  ];

  children.push(
    new Table({ rows: profileTableRows, width: { size: 8000, type: WidthType.DXA } }),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // --- CAPÍTULOS POR PERFIL ---
  for (const profile of profiles) {
    // Título de capítulo
    children.push(
      new Paragraph({
        children: [new TextRun({ text: profile.title, size: 40, bold: true, color: '080D3C' })],
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [new TextRun({ text: profile.description, size: 22, color: '6B7280' })],
        spacing: { after: 400 },
      }),
    );

    for (const page of profile.pages) {
      const imgPath = join(SCREENSHOTS_DIR, `${profile.name}-${page.name}.png`);

      children.push(
        new Paragraph({
          children: [new TextRun({ text: page.title, size: 28, bold: true, color: '6366F1' })],
          spacing: { before: 400, after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: `Ruta: /${page.name.replace(/-/g, '/')}`, size: 18, color: '9CA3AF' })],
          spacing: { after: 200 },
        }),
      );

      const img = imageFromFile(imgPath, 680, 400);
      if (img) {
        children.push(
          new Paragraph({
            children: [img],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
        );
      } else {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `[Captura no disponible: ${imgPath}]`, size: 20, color: 'EF4444', italics: true })],
            spacing: { after: 200 },
          }),
        );
      }
    }

    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // --- CREAR DOCUMENTO ---
  const doc = new Document({
    title: 'BasketFlow - Manual de Usuario',
    description: 'Manual de usuario completo de la plataforma BasketFlow',
    creator: 'BasketFlow Team',
    styles: {
      default: {
        document: {
          run: { font: 'Inter', size: 22 },
          paragraph: { spacing: { after: 120 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  writeFileSync(OUTPUT_PATH, buffer);
  console.log(`✅ Manual generado: ${OUTPUT_PATH}`);
}

generateManual().catch(console.error);
