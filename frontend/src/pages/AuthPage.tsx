
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { Navigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { checkSupabaseConnection } from '@/lib/supabase';

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters long" }),
});

const signupSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters long" }),
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;

export default function AuthPage() {
  const { user, isLoading, signIn, signUp, resetLoadingState, error } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("login");
  const [loadingTime, setLoadingTime] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] = useState<boolean | null>(null);

  // Check Supabase connection when component mounts
  useEffect(() => {
    async function checkConnection() {
      const isConnected = await checkSupabaseConnection();
      setConnectionStatus(isConnected);
      console.log('Supabase connection from AuthPage:', isConnected);
    }
    
    checkConnection();
  }, []);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
    },
  });

  // Track how long we've been in loading state
  useEffect(() => {
    let timer: number;
    
    if (isLoading) {
      const startTime = Date.now();
      timer = window.setInterval(() => {
        setLoadingTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      setLoadingTime(0);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isLoading]);

  // If user is already logged in, redirect to home page
  if (user && !isLoading) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (values: LoginFormValues) => {
    console.log('Login form submitted with email:', values.email);
    await signIn(values.email, values.password);
  };

  const handleSignup = async (values: SignupFormValues) => {
    console.log('Signup form submitted with email:', values.email);
    await signUp(values.email, values.password, values.firstName, values.lastName);
    // After successful signup, switch to login tab
    setActiveTab("login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">RYDS Sourcing Tool</h1>
          <p className="mt-2 text-center text-gray-600">
            Sign in or create an account to continue
          </p>
          
          {/* Connection status indicator */}
          {connectionStatus !== null && (
            <div className={`mt-2 text-sm ${connectionStatus ? 'text-green-600' : 'text-red-600'}`}>
              {connectionStatus 
                ? '✓ Connected to authentication service' 
                : '✗ Could not connect to authentication service'}
            </div>
          )}
        </div>

        <Card className="w-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <CardHeader>
                <CardTitle>Login</CardTitle>
                <CardDescription>
                  Enter your credentials to access your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Authentication Error</AlertTitle>
                    <AlertDescription>
                      {error.message || "An error occurred during authentication"}
                    </AlertDescription>
                  </Alert>
                )}
                
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="your@email.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="******" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isLoading || !connectionStatus}
                    >
                      {isLoading ? `Signing in${'.'.repeat(loadingTime % 4)}` : "Sign In"}
                    </Button>
                    
                    {/* Show loader info if we're in loading state */}
                    {isLoading && (
                      <p className="text-sm text-gray-500 text-center mt-2">
                        Loading for {loadingTime} seconds...
                      </p>
                    )}
                    
                    {/* Show reset button if loading for too long or if connection is bad */}
                    {(loadingTime >= 3 || connectionStatus === false) && (
                      <div className="mt-4">
                        <p className="text-amber-600 text-sm mb-2">
                          {connectionStatus === false 
                            ? "Connection to authentication service failed. You can try to reset:" 
                            : `Sign in has been loading for ${loadingTime} seconds. If this persists, you can try to reset:`}
                        </p>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={resetLoadingState}
                          className="w-full"
                        >
                          Reset Authentication State
                        </Button>
                      </div>
                    )}
                  </form>
                </Form>
              </CardContent>
            </TabsContent>
            
            <TabsContent value="signup">
              <CardHeader>
                <CardTitle>Create Account</CardTitle>
                <CardDescription>
                  Enter your information to create a new account
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Authentication Error</AlertTitle>
                    <AlertDescription>
                      {error.message || "An error occurred during authentication"}
                    </AlertDescription>
                  </Alert>
                )}
                
                <Form {...signupForm}>
                  <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={signupForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={signupForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={signupForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="your@email.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={signupForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="******" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isLoading || !connectionStatus}
                    >
                      {isLoading ? `Creating Account${'.'.repeat(loadingTime % 4)}` : "Create Account"}
                    </Button>
                    
                    {/* Show loader info if we're in loading state */}
                    {isLoading && (
                      <p className="text-sm text-gray-500 text-center mt-2">
                        Loading for {loadingTime} seconds...
                      </p>
                    )}
                    
                    {/* Show reset button if loading for too long */}
                    {(loadingTime >= 3 || connectionStatus === false) && (
                      <div className="mt-4">
                        <p className="text-amber-600 text-sm mb-2">
                          {connectionStatus === false 
                            ? "Connection to authentication service failed. You can try to reset:" 
                            : `Sign up has been loading for ${loadingTime} seconds. If this persists, you can try to reset:`}
                        </p>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={resetLoadingState}
                          className="w-full"
                        >
                          Reset Authentication State
                        </Button>
                      </div>
                    )}
                  </form>
                </Form>
              </CardContent>
              <CardFooter className="text-sm text-gray-500 text-center">
                <p>By signing up, you agree to our terms and privacy policy</p>
              </CardFooter>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
