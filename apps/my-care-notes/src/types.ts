export interface Snippet {
  id: string;
  name: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface NoteTab {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  closedAt?: number;
}
