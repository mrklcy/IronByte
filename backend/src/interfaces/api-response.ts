export interface ApiSuccess<TData = unknown, TMeta = unknown> {
  success: true;
  message: string;
  data: TData;
  meta?: TMeta;
}

export interface ApiFailure {
  success: false;
  message: string;
  errors?: unknown[];
}
