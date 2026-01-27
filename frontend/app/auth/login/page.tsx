"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { login } from "@/app/_apis/auth/auth";
import { login as loginAction } from "@/store/slices/authSlice";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const onSubmit = async (data: LoginFormData) => {
    console.log("Login data:", data);
    let loadingId;
    try {
      loadingId = toast.loading("Signing in...");
      const response = await login(data);
      if (!response) {
        return toast.error("Invalid credentials", { id: loadingId });
      }
      document.cookie = `token=${response.access_token}; path=/; max-age=3600`;
      console.log("Login response:", response);

      dispatch(
        // @ts-ignore
        loginAction({
          token: response.access_token,
          name: `${response.first_name} ${response.last_name}`,
          id: response.user_id,
        })
      );

      // Cleaner role-based routing
      const roleRoutes = {
        Super_Admin: "/superadmin",
        Hospital_Admin: "/hospital-admin",
        Receptionist: "/staff",
        Doctor: "/doctor",
        Patient: "/patient",
        Lab_Technician: "/lab-technician",
      };
      // console.log("routes: ",roleRoutes[response.role])
      router.push(roleRoutes[response.role] || "/");
      toast.success("Login successful", { id: loadingId });
    } catch (error) {
      if (error instanceof Error) {
        console.error("Login error:", error.message);
        toast.error(error.message || "Error signing in", { id: loadingId });
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome Back</CardTitle>
        <CardDescription>It's great to see you again</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="dr.nex@nexgenemr.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-sm text-[#388fe5] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                {...register("password")}
                className="pr-10"
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-[#388fe5] hover:opacity-80"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing In..." : "Sign In"}
          </Button>

          {/* <div className="text-center text-sm text-gray-600">
            New here?{" "}
            <Link
              href="/signup"
              className="text-[#388fe5] font-medium hover:underline"
            >
              Make a free account
            </Link>
          </div> */}
        </form>
      </CardContent>
    </Card>
  );
}
