import { useTranslation } from 'react-i18next'
import { siFacebook, siInstagram, siTiktok, siYoutube } from 'simple-icons/icons'
import oamkLogo from '../assets/images/oamk.png'

// Small SVG link component for social icons
function SocialIcon({ icon, href, label }) {
  return (
    <a
      href={href}
      aria-label={label}
      target="_blank"
      rel="noreferrer noopener"
      className="text-gray-400 hover:text-white transition-colors"
    >
      <svg role="img" viewBox="0 0 24 24" className="h-7 w-7 fill-current" aria-hidden="true">
        <path d={icon.path} />
      </svg>
    </a>
  )
}

export default function Footer() {
  // Translation helper for footer strings
  const { t } = useTranslation('common')

  return (
    <footer className="border-t border-gray-800 bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-sm text-gray-300">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-10 lg:gap-16 items-start">
          {/* Left column: API sources used by the app */}
          <div className="order-1 md:order-1 col-span-1">
            <h4 className="text-white font-semibold mb-3">{t('footerApiSources')}</h4>
            <ul className="space-y-2 list-disc ml-5">
              <li>{t('footerFinnkinoApi')}</li>
              <li>{t('footerTmdbApi')}</li>
            </ul>
          </div>

          {/* Center column: Social links and copyright */}
          <div className="text-center order-3 md:order-2 col-span-2 md:col-span-1">
            <h4 className="text-white font-semibold mb-4">{t('footerFollowUs')}</h4>
            <div className="flex justify-center gap-5">
              {[
                { icon: siFacebook, href: '#', label: 'Facebook' },
                { icon: siInstagram, href: '#', label: 'Instagram' },
                { icon: siTiktok, href: '#', label: 'TikTok' },
                { icon: siYoutube, href: '#', label: 'YouTube' },
              ]
                // Remove icons that are missing or malformed
                .filter((x) => x.icon && x.icon.path)
                .map((x) => (
                  <SocialIcon key={x.label} icon={x.icon} href={x.href} label={x.label} />
                ))}
            </div>
            {/* Current year is generated dynamically */}
            <p className="mt-6 text-gray-400">
              © {new Date().getFullYear()} Movie App - All rights reserved
            </p>
          </div>

          {/* Right column: Authors and partner logo */}
          <div className="flex flex-col gap-4 items-center md:items-end order-2 md:order-3 col-span-1">
            <div className="w-full md:w-auto text-center md:text-left">
              <h4 className="text-white font-semibold mb-3">{t('footerAuthors')}</h4>
              <ul className="space-y-2 list-disc ml-5 md:ml-5 inline-block text-left">
                <li>{t('footerTeamR13')}</li>
              </ul>
            </div>
            <img src={oamkLogo} alt="OAMK" className="h-6 w-auto opacity-90" />
          </div>
        </div>
      </div>
    </footer>
  )
}
