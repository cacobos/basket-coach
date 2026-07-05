export interface BaseRepository<T, CreateDto = Partial<T>, UpdateDto = Partial<T>> {
  findAll(filters?: unknown): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  create(dto: CreateDto): Promise<T>;
  update(id: string, dto: UpdateDto): Promise<T>;
  remove(id: string): Promise<void>;
}
