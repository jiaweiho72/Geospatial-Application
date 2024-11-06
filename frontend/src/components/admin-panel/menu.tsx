"use client";

import Link from "next/link";
import { Ellipsis, LogOut } from "lucide-react";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { getMenuList } from "@/lib/menu-list";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CollapseMenuButton } from "@/components/admin-panel/collapse-menu-button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider
} from "@/components/ui/tooltip";
import { useRouter } from 'next/navigation';
import { useAppContext } from '../../context/AppContext';
import ConfirmationDialog from '../custom_app_components/ConfirmationDialog';
import React, { useState } from "react";


interface MenuProps {
  isOpen: boolean | undefined;
}

export function Menu({ isOpen }: MenuProps) {
  const pathname = usePathname();
  const menuList = getMenuList(pathname);
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
      <ScrollArea className="[&>div>div[style]]:!block">
        <nav className="mt-3 h-full w-full">
          {/* <ul className="flex flex-col min-h-[calc(100vh-48px-36px-16px-32px)] lg:min-h-[calc(100vh-32px)] items-start space-y-1 px-2"> */}
          <ul className="flex flex-col min-h-[calc(100vh-48px-36px-16px-32px)] lg:min-h-[calc(100vh-32px-40px-32px)] items-start space-y-1 px-2">

            {menuList.map(({ groupLabel, menus }, index) => (
              <li className={cn("w-full", groupLabel ? "pt-5" : "")} key={index}>
                {(isOpen && groupLabel) || isOpen === undefined ? (
                  <p className="text-sm font-medium text-muted-foreground px-4 pb-2 max-w-[248px] truncate">
                    {groupLabel}
                  </p>
                ) : !isOpen && isOpen !== undefined && groupLabel ? (
                  <TooltipProvider>
                    <Tooltip delayDuration={100}>
                      <TooltipTrigger className="w-full">
                        <div className="w-full flex justify-center items-center">
                          <Ellipsis className="h-5 w-5" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{groupLabel}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <p className="pb-2"></p>
                )}
                {menus.map(
                  ({ href, label, icon: Icon, active, submenus }, index) =>
                    submenus.length === 0 ? (
                      <div className="w-full" key={index}>
                        <TooltipProvider disableHoverableContent>
                          <Tooltip delayDuration={100}>
                            <TooltipTrigger asChild>
                              {/* <Button
                                variant={active ? "secondary" : "ghost"}
                                className="w-full justify-start h-10 mb-1"
                                asChild
                              >
                                <Link href={href}>
                                  <span
                                    className={cn(isOpen === false ? "" : "mr-4")}
                                  >
                                    <Icon size={18} />
                                  </span>
                                  <p
                                    className={cn(
                                      "max-w-[200px] truncate",
                                      isOpen === false
                                        ? "-translate-x-96 opacity-0"
                                        : "translate-x-0 opacity-100"
                                    )}
                                  >
                                    {label}
                                  </p>
                                </Link>
                              </Button> */}
                              <Button
                                variant={active ? "secondary" : "ghost"}
                                // className="w-full justify-start h-10 mb-5 flex items-center"
                                className={cn(
                                  'h-16 mb-1 w-full',
                                  isOpen === false
                                    ? "justify-centre flex items-centre"
                                    : "justify-start flex items-centre"
                                )}
                                asChild
                              >
                                <Link href={href}>
                                  <div
                                    className={cn(
                                      "flex items-center justify-center",
                                      isOpen === false ? "flex-col" : "flex-row"
                                    )}
                                  >
                                    <span
                                      className={cn(isOpen === false ? "" : "mr-4")}
                                    >
                                      <Icon size={21} />
                                    </span>
                                    <p
                                      className={cn(
                                        "max-w-[200px] truncate",
                                        isOpen === false
                                          ? "-translate-x-0 opacity-100 mt-1 text-[11px]"
                                          : "-translate-x-0 opacity-100 text-base"
                                      )}
                                    >
                                      {label}
                                    </p>
                                  </div>
                                </Link>
                              </Button>

                            </TooltipTrigger>
                            {isOpen === false && (
                              <TooltipContent side="right">
                                {label}
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    ) : (
                      <div className="w-full" key={index}>
                        <CollapseMenuButton
                          icon={Icon}
                          label={label}
                          active={active}
                          submenus={submenus}
                          isOpen={isOpen}
                        />
                      </div>
                    )
                )}
              </li>
            ))}
            <li className="w-full grow flex items-end">
              <TooltipProvider disableHoverableContent>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleClick}
                      variant="outline"
                      className="w-full justify-center h-10"
                    >
                      <span className={cn(isOpen === false ? "" : "mr-4")}>
                        <LogOut size={18} />
                      </span>
                      <p
                        className={cn(
                          "whitespace-nowrap",
                          isOpen === false ? "opacity-0 hidden" : "opacity-100"
                        )}
                      >
                        Sign out
                      </p>
                    </Button>
                  </TooltipTrigger>
                  {isOpen === false && (
                    <TooltipContent side="right">Sign out</TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </li>
          </ul>
        </nav>
      </ScrollArea>
    </div>
  );
}
