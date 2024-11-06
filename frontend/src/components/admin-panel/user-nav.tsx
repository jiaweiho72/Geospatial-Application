"use client";

import Link from "next/link";
import { LayoutGrid, LogOut, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import ConfirmationDialog from '../custom_app_components/ConfirmationDialog';
import { useRouter } from 'next/navigation';
import { useAppContext } from '../../context/AppContext';
import React, { useState } from "react";

export function UserNav() {
  const router = useRouter();
  const { isStateTrue, setStateFalse } = useAppContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);


  const handleSignOut = () => {
    router.push('/');
    setStateFalse();
    console.log('Signing out...');
  };

  const handleClick = () => {
    setIsDialogOpen(true)
  }

  const handleConfirmSignout = () => {
    handleSignOut();
    setIsDialogOpen(false);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    // window.location.reload();
  };
  return (
    <div>
      <ConfirmationDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onConfirm={handleConfirmSignout}
        title="Sign Out"
        description="Are you sure you want to sign out?"
      />
    
      <DropdownMenu>
        <TooltipProvider disableHoverableContent>
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="relative h-8 w-8 rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="#" alt="Avatar" />
                    <AvatarFallback className="bg-transparent">A</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">Profile</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">Admin</p>
              <p className="text-xs leading-none text-muted-foreground">
                genexis.gov.sg
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem className="hover:cursor-pointer" asChild>
              <Link href="/dashboard" className="flex items-center">
                <LayoutGrid className="w-4 h-4 mr-3 text-muted-foreground" />
                Dashboard
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="hover:cursor-pointer" asChild>
              <Link href="/dashboard/report" className="flex items-center">
                <FileText className="w-4 h-4 mr-3 text-muted-foreground" />
                Report
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="hover:cursor-pointer" onClick={handleClick}>
            <LogOut className="w-4 h-4 mr-3 text-muted-foreground" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
