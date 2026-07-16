export interface ISubmitContactRequest {
  name: string;
  email: string;
  message: string;
  phone?: string;
  subject?: string;
  metadata?: Record<string, any>;
}
