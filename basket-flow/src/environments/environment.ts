import { isDevMode } from '@angular/core';

export const environment = {
  production: !isDevMode(),
  appUrl: 'https://basket-flow-alpha.vercel.app',
  supabaseUrl: 'https://ttythziuthbrfopzxtvh.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0eXRoeml1dGhicmZvcHp4dHZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNDQ2MTMsImV4cCI6MjA5NzYyMDYxM30.mziwMqgaBaAEPZ3B7CQM2_h4nMo8xsoB_S0WIlS6mYU',
};
