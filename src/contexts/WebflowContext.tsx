import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface FeaturedProduct {
  addOnImages?: string[];
  category: string;
  createdAt?: any;
  description: string;
  discount: number;
  id: string;
  mainImage: string;
  name: string;
  price: number;
  sku: string;
  stock: number;
}

interface WebflowData {
  banner: string[];
  categories: { icon: string; name: string }[];
  discount: number;
  minimumPurchaseAmount?: number;
  minimumpurchaseAmount?: number;
  sale: { isActive: boolean };
}

interface WebflowContextType {
  webflowData: WebflowData | null;
  webflowLoading: boolean;
  webflowError: string | null;
  featuredData: FeaturedProduct[] | null;
  featuredLoading: boolean;
  featuredError: string | null;
}

const WebflowContext = createContext<WebflowContextType | undefined>(undefined);

export const useWebflow = () => {
  const ctx = useContext(WebflowContext);
  if (!ctx) throw new Error("useWebflow must be used within WebflowProvider");
  return ctx;
};

export const WebflowProvider = ({ children }: { children: ReactNode }) => {
  const [webflowData, setWebflowData] = useState<WebflowData | null>(null);
  const [webflowLoading, setWebflowLoading] = useState(true);
  const [webflowError, setWebflowError] = useState<string | null>(null);

  const [featuredData, setFeaturedData] = useState<FeaturedProduct[] | null>(null);
  const [featuredLoading, setFeaturedLoading] = useState(false);
  const [featuredError, setFeaturedError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWebflow = async () => {
      setWebflowLoading(true);
      try {
        const snap = await getDoc(doc(db, "webflow", "webflowData"));
        if (snap.exists()) 
          {console.log(snap.data())
            setWebflowData(snap.data() as WebflowData);}
        else throw new Error("webflowData not found");
      } catch (err: any) {
        setWebflowError(err.message);
      } finally {
        setWebflowLoading(false);
      }
    };
    fetchWebflow();
  }, []);

  useEffect(() => {
    const fetchFeatured = async () => {
      if (!webflowData) return;
      setFeaturedLoading(true);
      try {
        const snap = await getDoc(doc(db, "meta", "featured"));
        if (snap.exists()) 
          {
            console.log(snap.data().featured)
            setFeaturedData(snap.data().featured as FeaturedProduct[]);
          }
        else throw new Error("featured not found");
      } catch (err: any) {
        setFeaturedError(err.message);
      } finally {
        setFeaturedLoading(false);
      }
    };
    fetchFeatured();
  }, [webflowData]);

  return (
    <WebflowContext.Provider
      value={{
        webflowData,
        webflowLoading,
        webflowError,
        featuredData,
        featuredLoading,
        featuredError,
      }}
    >
      {children}
    </WebflowContext.Provider>
  );
};
