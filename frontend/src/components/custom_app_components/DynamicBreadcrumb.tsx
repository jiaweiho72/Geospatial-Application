'use client'

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';

const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
};

const DynamicBreadcrumb = () => {
    const pathname = usePathname(); // Get the current path
    const pathnames = pathname.split('/').filter((x) => x);

    return (
        <Breadcrumb>
            <BreadcrumbList>
                {pathnames.map((value, index) => {
                    const isLast = index === pathnames.length - 1;
                    const href = `/${pathnames.slice(0, index + 1).join('/')}`;
                    const capitalizedValue = capitalizeFirstLetter(value); // Capitalize first letter
                    return (
                        <React.Fragment key={index}>
                            {index > 0 && <BreadcrumbSeparator />}
                            <BreadcrumbItem>
                                {isLast ? (
                                    <BreadcrumbPage>{capitalizedValue}</BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink asChild>
                                        <Link href={href}>{capitalizedValue}</Link>
                                    </BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                        </React.Fragment>
                    );
                })}
            </BreadcrumbList>
        </Breadcrumb>
    );
};

export default DynamicBreadcrumb;
