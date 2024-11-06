'use client'

import AdminPanelLayout from '@/components/admin-panel/admin-panel-layout';
import AccessDenied from '../../components/custom_app_components/AccessDenied';
import { useAppContext } from '../../context/AppContext';
import Loading from '../../components/custom_app_components/Loading'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isStateTrue, isInitialized } = useAppContext();
  console.log(isStateTrue)

  if (!isInitialized) {
    // return <Loading/>
    return <div />
  }

  if (!isStateTrue) {
    return <AccessDenied/>
  }

  return (
    <div>
      <AdminPanelLayout>
        {children}
      </AdminPanelLayout>
    </div>
  );
}
