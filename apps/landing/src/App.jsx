import Footer from "./components/Footer.jsx";
import Hero from "./components/Hero.jsx";
import HowItWorks from "./components/HowItWorks.jsx";
import Platform from "./components/Platform.jsx";
import ProductShowcase from "./components/ProductShowcase.jsx";
import Showcase from "./components/Showcase.jsx";

export default function App() {
  return (
    <>
      <main>
        <Hero />
        <Showcase />
        <ProductShowcase />
        <Platform />
        <HowItWorks />
      </main>
      <Footer />
    </>
  );
}
