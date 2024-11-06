import React, { useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

interface ErrorMessageProps {
  message: string;
  variant?: 'default' | 'destructive'; // Add variant as an optional prop
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, variant = 'destructive' }) => {
  const { toast } = useToast();

  useEffect(() => {
    toast({
      title: 'Error',
      description: message,
      variant: variant, // Pass the variant to the toast
      duration: 3000,
    });
  }, [message, variant, toast]);

  return (
    <Toaster />
  );
};

export default ErrorMessage;
