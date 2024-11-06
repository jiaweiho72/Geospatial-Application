import { Navbar } from "@/components/admin-panel/navbar";
import Image from 'next/image';
import map from '../../../public/map.svg'

interface ContentLayoutProps {
  title: string;
  children: React.ReactNode;
}

export function ContentLayout({ title, children }: ContentLayoutProps) {
  return (
    <div>
      <div className="relative z-10">
        <Navbar title={title}/>
        {/* <div className="container pt-8 pb-8 px-4 sm:px-8 min-h-[calc(100vh_-_64px)]">{children}</div> */}
        <div className="container pt-8 pb-8 px-4 sm:px-8 z-10">{children}</div>
      </div>
      {/* <div className="fixed inset-0 overflow-hidden opacity-75 z-0">
        <Image
          alt="World Map"
          src={map}
          layout="fill"
          objectFit="cover"
          quality={100}
          className="opacity-50"
        />
      </div> */}
      
      {/* <div className="container min-h-[calc(100vh_-_64px)]">{children}</div> */}
    </div>
  );
}
