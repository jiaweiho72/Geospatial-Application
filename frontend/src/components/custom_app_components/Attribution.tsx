import Image from 'next/image';
import om from '../../../public/om_logo.png'

const Attribution = () => (
  <div className="leaflet-bottom leaflet-left">
    <div className="leaflet-control-attribution leaflet-control flex items-center space-x-1 text-xs z-10">
      <span>&copy;</span>
      <Image
        src={om}
        alt="OneMap logo"
        width={20}  
        height={20}
      />
      <a 
        href="https://www.onemap.gov.sg/" 
        target="_blank" 
        rel="noopener noreferrer" 
        className="hover:underline"
      >
        OneMap
      </a>
      <span>&copy; contributors &#124;</span>
      <a 
        href="https://www.sla.gov.sg/" 
        target="_blank" 
        rel="noopener noreferrer" 
        className="hover:underline"
      >
        Singapore Land Authority
      </a>
    </div>
  </div>
  
);

export default Attribution;