// Type declarations to add Express.User
import express from 'express';

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      [key: string]: any; // Allow any other properties on the user
    }
  }
}

export {};