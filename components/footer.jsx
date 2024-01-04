import Image from 'next/image';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className='mt-8 bg-zinc-900 py-4' id='connect'>
      <div className='m-auto flex max-w-[90vw] flex-col items-center justify-between sm:max-w-[75vw] md:flex-row md:items-start'>
        <div className='address mb-8 flex flex-col items-center text-center text-white md:block md:text-start'>
          <div className='flex flex-row items-center py-2 font-bold'>
            <Image
              src='/icons/location.png'
              alt='CESA'
              width={20}
              height={20}
              className='mr-1'
            />
            {`Address`}
          </div>
          <div className='address w-60 text-sm'>
            {`BVCOENM, Sector-7, CBD Belapur, Navi Mumbai, Maharashtra 400614`}
          </div>
        </div>

        <div className='follow mb-8 w-40 text-center text-white'>
          <div className='py-2 font-bold'>{`Follow Us`}</div>
          <div className='flex justify-around'>
            <Link href='https://www.instagram.com/cesa.bvcoe/' target='_blank'>
              <Image
                src='/icons/instagram.webp'
                alt='CESA'
                width={32}
                height={32}
                className='h-10 w-10 rounded-full'
                quality={100}
              />
            </Link>
          </div>
        </div>

        <div className='flex flex-col items-center text-center text-white md:items-start'>
          <div className='py-2 font-bold'>{`Contact Us`}</div>
          <div className='flex flex-row items-center'>
            <Image
              src='/icons/phone.png'
              alt='CESA'
              width={16}
              height={16}
              className='mr-1'
            />
            {`+91 8169840285`}
          </div>
          <div className='flex flex-row items-center'>
            <Image
              src='/icons/email.png'
              alt='CESA'
              width={16}
              height={16}
              className='mr-1'
            />
            {`cesaofficial2023@gmail.com`}
          </div>
        </div>
      </div>
    </footer>
  );
}
