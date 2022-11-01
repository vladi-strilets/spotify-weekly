import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html>
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        {/* <!-- Primary Meta Tags --> */}
        <meta
          name="title"
          content="Spotify Weekly: autosave your Discover Weekly playlist"
        />
        <meta
          name="description"
          content="Automatically save your Discover Weekly songs from Spotify into a private playlist called Spotify Weekly every Tuesday."
        />

        {/* <!-- Open Graph / Facebook --> */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://spotify-weekly.vercel.app/" />
        <meta
          property="og:title"
          content="Spotify Weekly: autosave your Discover Weekly playlist"
        />
        <meta
          property="og:description"
          content="Automatically save your Discover Weekly songs from Spotify into a private playlist called Spotify Weekly every Tuesday."
        />
        <meta
          property="og:image"
          content="https://spotify-weekly.vercel.app/headphone.jpg"
        />

        {/* <!-- Twitter --> */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta
          property="twitter:url"
          content="https://spotify-weekly.vercel.app/"
        />
        <meta
          property="twitter:title"
          content="Spotify Weekly: autosave your Discover Weekly playlist"
        />
        <meta
          property="twitter:description"
          content="Automatically save your Discover Weekly songs from Spotify into a private playlist called Spotify Weekly every Tuesday."
        />
        <meta
          property="twitter:image"
          content="https://spotify-weekly.vercel.app/headphone.jpg"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
