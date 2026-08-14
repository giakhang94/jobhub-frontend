"use client";
import { Input } from "@/components/ui/input";
import api from "@/lib/axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

// validation schema using zod
const loginSchema = z.object({
  email: z.string().email("Invalid Email"),
  password: z.string().min(6, "Password should contain at least 6 characters"),
});

type LoginFormType = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormType>({
    resolver: zodResolver(loginSchema),
  });

  const loginMutation = useMutation({
    // ***
    mutationFn: async (data: LoginFormType) => {
      //call api
      const response = await api.post("/auth/login", data);
      return response.data;
    },
    onSuccess: () => {
      router.push("/");
    },
    onError: (error) => {
      console.log(error);
    },
  });

  const onSubmit = (data: LoginFormType) => {
    loginMutation.mutate(data);
    // the mutationFn (***)
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow-md border border-slate-100">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Login to JobHub
          </h2>
          <p className="mt-1 text-sm text-slate-500">Enter your credentials</p>
        </div>

        {loginMutation.isError && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
            {(loginMutation.error as any)?.response?.data?.message ||
              "Login failed, please try again"}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            {/* Dùng Input của shadcn/ui */}
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            {/* Dùng Input của shadcn/ui */}
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-red-500">{errors.password.message}</p>
            )}
          </div>

          {/* Dùng Button của shadcn/ui */}
          <Button
            type="submit"
            className="w-full"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? "Loading..." : "Login"}
          </Button>
        </form>
      </div>
    </div>
  );
}
