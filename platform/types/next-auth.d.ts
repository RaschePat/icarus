import "next-auth";

declare module "next-auth" {
  interface User {
    role?: string;
    user_id?: string;
    access_token?: string;
  }

  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      user_id?: string;
      access_token?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    user_id?: string;
    access_token?: string;
  }
}
