export default function manifest() {
  return {
    name: "React Messenger",
    short_name: "Messages",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#007aff",
    icons: [
      { src: "/react-messenger.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
