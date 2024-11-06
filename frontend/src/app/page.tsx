
import dynamic from "next/dynamic";
import React from 'react';
import { AppProps } from 'next/app';
import { AppProvider } from '../context/AppContext';
import { Metadata } from 'next'


// import Login from './pages/login_page/page'; // Adjust the path based on your actual folder structure

const DynamicLoginComponent = dynamic(() => import("./login/page"), { ssr: false });

// export const metadata: Metadata = {
//   title: 'Block Finder',
//   description: 'HTX',
// }

const Page = () => {
  return (
    <div>
      <DynamicLoginComponent />
    </div>
  );
};

export default Page;
