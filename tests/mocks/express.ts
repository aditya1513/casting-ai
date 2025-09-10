/**
 * Express Mock Utilities
 * Provides mock implementations for Express Request and Response objects
 */

import { Request, Response } from 'express';

export const mockRequest = (options: Partial<Request> = {}): Partial<Request> => {
  return {
    body: {},
    query: {},
    params: {},
    headers: {},
    ip: '127.0.0.1',
    method: 'GET',
    url: '/',
    cookies: {},
    session: {} as any,
    ...options
  };
};

export const mockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    locals: {}
  };
  return res;
};

export const mockNext = jest.fn();

export const createMockMiddleware = () => {
  return {
    req: mockRequest(),
    res: mockResponse(),
    next: mockNext
  };
};