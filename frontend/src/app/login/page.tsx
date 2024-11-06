'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '../../context/AppContext';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { Navigation } from 'lucide-react';
import map from '../../../public/map.svg'
import { Loader } from "lucide-react";



const rootURL = process.env.NEXT_PUBLIC_ROOT_URL_FRONTEND;

export default function AuthenticationPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { setStateTrue } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${rootURL}/api/login`, { username, password });
      if (response.data.success) {
        console.log('Login successful');
        setStateTrue();
        router.push('/dashboard');
      } else {
        setError('Invalid username or password');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="container relative hidden h-dvh flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
        {/* <Link
          href="/examples/authentication"
          className={cn(
            "absolute right-4 top-4 md:right-8 md:top-8"
          )}
        >
          Login
        </Link> */}
        <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
          <div className="absolute inset-0 bg-zinc-900" />
          <div className="inset-0 opacity-50">
            <Image
              alt="World Map"
              src={map}
              layout="fill"
              objectFit="cover"
              quality={100}
              className="opacity-5"
            />
          </div>
          <div className="relative z-20 flex items-center text-lg font-medium">
           <Navigation className="mr-2 h-4 w-4 text-muted-foreground"/>

            Block Finder
          </div>
          
  
        </div>

        <div className="lg:p-8">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            <div className="flex flex-col space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">
                Sign in to your account
              </h1>
              <p className="text-sm text-muted-foreground">
                Enter your username and password below to sign in
              </p>
            </div>
            <form className="grid gap-6" onSubmit={handleLogin}>
              <div className="grid gap-2">
                <div className="grid gap-1">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
              </div>
              <Button type="submit" disabled={isLoading}>
                {isLoading && (
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                )}
                Sign in
              </Button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
