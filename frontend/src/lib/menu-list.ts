import {
  Tag,
  Users,
  Settings,
  Bookmark,
  SquarePen,
  LayoutGrid,
  Upload,
  Map,
  LayoutDashboard,
  FileSpreadsheet,
  FileText,
  Locate,
  Globe,
  MapPinned,
  LayoutPanelLeft,
  PanelsTopLeft
} from "lucide-react";

type Submenu = {
  href: string;
  label: string;
  active: boolean;
};

type Menu = {
  href: string;
  label: string;
  active: boolean;
  icon: any;
  submenus: Submenu[];
};

type Group = {
  groupLabel: string;
  menus: Menu[];
};

export function getMenuList(pathname: string): Group[] {
  return [
    {
      groupLabel: "",
      menus: [
        {
          href: "/dashboard/map",
          label: "Map",
          active: pathname.includes("/dashboard/map"),
          icon: Globe,
          submenus: []
        },
        {
          href: "/dashboard",
          label: "Dashboard",
          // active: pathname.includes("/dashboard"),
          active: pathname === "/dashboard",
          // icon: LayoutDashboard,
          icon: LayoutGrid,
          submenus: []
        },
        {
          href: "/dashboard/report",
          label: "Report",
          active: pathname.includes("/dashboard/report"),
          // icon: LayoutGrid,
          icon: FileText,

          submenus: []
        },
      ]
    },
    // {
    //   groupLabel: "Contents",
    //   menus: [
    //     // {
    //     //   href: "",
    //     //   label: "Posts",
    //     //   active: pathname.includes("/posts"),
    //     //   icon: SquarePen,
    //     //   submenus: [
    //     //     {
    //     //       href: "/posts",
    //     //       label: "All Posts",
    //     //       active: pathname === "/posts"
    //     //     },
    //     //     {
    //     //       href: "/posts/new",
    //     //       label: "New Post",
    //     //       active: pathname === "/posts/new"
    //     //     }
    //     //   ]
    //     // },
    //     {
    //       href: "/pages/main/modelling",
    //       label: "Model",
    //       active: pathname.includes("/pages/main/modelling"),
    //       icon: Bookmark,
    //       submenus: []
    //     },
    //     {
    //       href: "/tags",
    //       label: "Tags",
    //       active: pathname.includes("/tags"),
    //       icon: Tag,
    //       submenus: []
    //     }
    //   ]
    // },
    // {
    //   groupLabel: "Settings",
    //   menus: [
    //     {
    //       href: "/users",
    //       label: "Users",
    //       active: pathname.includes("/users"),
    //       icon: Users,
    //       submenus: []
    //     },
    //     {
    //       href: "/account",
    //       label: "Account",
    //       active: pathname.includes("/account"),
    //       icon: Settings,
    //       submenus: []
    //     }
    //   ]
    // }
  ];
}
