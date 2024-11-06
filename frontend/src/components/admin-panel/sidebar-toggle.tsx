import { ChevronLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useStore } from "@/hooks/use-store";
import { useSidebarToggle } from "@/hooks/use-sidebar-toggle";
import { PanelsTopLeft } from "lucide-react";
import { IoMenuOutline, IoChevronBack } from "react-icons/io5";


interface SidebarToggleProps {
  isOpen: boolean | undefined;
  setIsOpen?: () => void;
}

export function SidebarToggle({ isOpen, setIsOpen }: SidebarToggleProps) {
  const sidebar = useStore(useSidebarToggle, (state) => state);
  return (
    <div className="invisible lg:visible z-20 mt-2 flex items-center m-2">
      {/* <Button
        onClick={() => setIsOpen?.()}
        className="rounded-md w-8 h-8"
        variant="ghost"
        size="icon"
      >
        <ChevronLeft
          className={cn(
            "h-4 w-4 transition-transform ease-in-out duration-700",
            isOpen === false ? "rotate-180" : "rotate-0"
          )}
        />
      </Button> */}

      <Button
        onClick={() => setIsOpen?.()}
        className={cn(
          "transition-transform ease-in-out duration-300 rounded-md mt-3 flex cursor-pointer",
          sidebar?.isOpen === false ? "translate-x-0 w-full justify-center" : "translate-x-0 w-full justify-end"
        )}
        variant="link"
        asChild
      >
        <div 
          className="items-center gap-4"
        >
          <h1
            className={cn(
              "font-bold text-lg whitespace-nowrap transition-[transform,opacity,display] ease-in-out duration-300",
              sidebar?.isOpen === false
                ? "-translate-x-96 opacity-0 hidden"
                : "translate-x-0 opacity-100"
            )}
          >
            Menu
          </h1>
          {/* <IoMenuOutline className="w-7 h-7 mr-0" /> */}
          {!sidebar?.isOpen ? (
            <IoMenuOutline size={24} />
          ) : (
            <IoChevronBack size={24} />
          )}
          
        </div>
      </Button>
    </div>
  );
}
