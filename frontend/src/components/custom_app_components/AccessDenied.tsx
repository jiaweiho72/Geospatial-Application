import Link from 'next/link';
import { useAppContext } from '../../context/AppContext';
import '../../app/globals.css';

const AccessDenied: React.FC = () => {
    const { isStateTrue } = useAppContext();

    if (!isStateTrue) {
        return (
            <div className="flex h-screen justify-center items-center bg-gray-200">
                <div className="text-center">
                    <h1 className="text-4xl text-red-600 font-bold mb-4">Access Denied</h1>
                    <p className="text-lg text-gray-800 mb-8">
                        Sorry, you are not authorized to access this page.
                    </p>
                    <Link href="/" className="text-black text-lg font-bold underline">
                        Click here to sign in
                    </Link>
                </div>
            </div>
        );
    }
}

export default AccessDenied;