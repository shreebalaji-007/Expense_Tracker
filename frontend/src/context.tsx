import { createContext, useContext } from "react";
export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
};
export const Context = createContext<any>(null);
export const useApp = () =>
  useContext(Context) as {
    user: User;
    prefs: any;
    setPrefs: (p: any) => void;
    setUser: (u: User | null) => void;
    toast: (m: string) => void;
    money: (n: number) => string;
    formatDate: (v: string) => string;
  };
