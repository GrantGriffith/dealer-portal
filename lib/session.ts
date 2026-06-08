import { SessionOptions } from 'iron-session'

export interface DealerSessionData {
  dealerId: number
  email: string
  firstName: string
  lastName: string
  company: string
}

export interface AdminSessionData {
  adminId: number
  email: string
}

export const dealerSessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: 'gs_dealer',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 10, // 10 hours
  },
}

export const adminSessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: 'gs_admin',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 8, // 8 hours
  },
}
