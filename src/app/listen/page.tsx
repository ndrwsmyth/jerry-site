import NavBar from "@/components/NavBar";

export default function Listen() {
  return (
    <>
      <NavBar />


      <div className="pt-24 pb-16 px-4 max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Listen</h1>
        <div className="mt-8 flex justify-center">
          <iframe
            allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write"
            frameBorder="0"
            height="450"
            style={{width:"100%", maxWidth:"660px", overflow:"hidden", borderRadius:"10px"}}
            sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
            src="https://embed.music.apple.com/us/playlist/2025/pl.u-leyl2gRfjLDeXGK"
          />
        </div>

        <div className="mt-8 flex justify-center">
          <iframe
            allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write"
            frameBorder="0"
            height="450"
            style={{width:"100%", maxWidth:"660px", overflow:"hidden", borderRadius:"10px"}}
            sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
            src="https://embed.music.apple.com/us/playlist/2024/pl.u-leylMdYhjLDeXGK"
          />
        </div>
      </div>
    </>
  );
}
