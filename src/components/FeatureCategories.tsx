import { Minus, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useWebflow } from "@/contexts/WebflowContext";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

const FeatureCategories = () => {
  const navigate = useNavigate();
  const { featuredData, featuredLoading, featuredError } = useWebflow();
   console.log(featuredData)
  const { cartItems, addToCart, updateQuantity, updateSize, getProductQuantity } = useCart();

  const [sizeInputs, setSizeInputs] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const sizesFromCart: { [key: string]: string } = {};
    cartItems.forEach((item) => {
      if (item.size) sizesFromCart[item.id] = item.size;
    });
    setSizeInputs(sizesFromCart);
  }, [cartItems]);

  const handleSizeChange = (product: any, value: string, quantity: number) => {
    // Validate and limit total quantity to 999999
    const numbers = value.match(/\d+/g)?.map(Number) || [];
    const totalQty = numbers.reduce((sum, num) => sum + num, 0);
    
    if (totalQty > 999999) {
      // If total exceeds limit, don't update the input
      return;
    }
    
    setSizeInputs((prev) => ({ ...prev, [product.id]: value }));
    if (quantity > 0) updateSize(product.id, value);
    else if (value.trim() !== "")
      addToCart(
        {
          id: product.id,
          name: product.name,
          price: product.price - (product.discount / 100) * product.price,
          image: product.mainImage,
          category: product.category,
          shippingPrice:product.shippingPrice,
        },
        value
      );
  };

  return (
    <section className="py-10 bg-gradient-elegant">
      <div className="container mx-auto px-4">
        <div>
          <div className="section-header">
            <h2 className="section-title">Featured Product</h2>
          </div>

          {featuredLoading && (
            <p className="text-center text-muted-foreground">Loading products...</p>
          )}
          {featuredError && <p className="text-center text-red-500">{featuredError}</p>}

          {featuredData && (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
              {featuredData.map((product: any, index: number) => {
                const quantity = getProductQuantity(product.id);
                const discountedPrice = product.discount
                  ? Math.round(product.price - (product.price * product.discount) / 100)
                  : product.price;
                // Calculate MRP if not provided - assume 20% markup from our price
                const mrp = product.mrp || Math.round(discountedPrice * 1.2);
                const sizeInput = sizeInputs[product.id] || "";
                const moq = product.moq || 1;
                const isBelowMOQ = quantity < moq;
                
                // Calculate total quantity from size input with max limit
                const totalQuantity = Math.min(
                  sizeInput.match(/\d+/g)?.map(Number).reduce((sum, num) => sum + num, 0) || 0,
                  999999
                );
                
                // Calculate total prices based on quantity
                const totalPrice = discountedPrice * totalQuantity;
                const totalMrp = mrp * totalQuantity;

                return (
                  <Card
                    key={product.id}
                    className="product-card group cursor-pointer transition-transform transform hover:-translate-y-1"
                    style={{ animationDelay: `${index * 0.1}s` }}
                    onClick={() =>
                      navigate(`/product/${product.id}`, { state: { product } })
                    }
                  >
                    {/* Product Image */}
                    <div
                      className="relative overflow-hidden rounded-t-xl h-48 md:h-60 w-full mx-auto flex items-center justify-center bg-white"
                    >
                      <img
                        src={product.mainImage}
                        alt={product.name}
                        className="w-full h-full object-contain relative z-10 group-hover:scale-105 transition-transform duration-500"
                      />
                      {product.discount > 0 && (
                        <div className="absolute top-2 left-2 md:top-3 md:left-3 z-20">
                          <span className="inline-block px-1.5 py-0.5 md:px-2 md:py-1 bg-primary text-primary-foreground text-xs font-semibold rounded">
                            {product.discount}% OFF
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all rounded-t-xl" />
                    </div>

                    <CardContent className="p-3 md:p-4">
                      {/* Product Info */}
                      <h3 className="font-semibold mb-2 text-sm md:text-base text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-2 leading-tight">
                        {product.name}
                      </h3>
                      <div className="mb-3 space-y-1">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-primary text-sm md:text-lg">
                            FT Price: {(totalQuantity > 0 || quantity > 0) ? `Rs ${(quantity > 0 ? discountedPrice * quantity : totalPrice)}` : `Rs ${discountedPrice}`}
                          </span>
                          <span className="font-bold text-red-600 text-xs md:text-base line-through">
                            MRP Price: {(totalQuantity > 0 || quantity > 0) ? `Rs ${(quantity > 0 ? mrp * quantity : totalMrp)}` : `Rs ${mrp}`}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          MOQ: {moq} Pcs
                          {(totalQuantity > 0 || quantity > 0) && (
                            <span className="ml-2 text-green-600 font-semibold">
                              Total Qty: {quantity > 0 ? quantity : totalQuantity}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Size Input */}
                      <input
                        type="text"
                        placeholder="Size & Qty"
                        value={sizeInput}
                        onChange={(e) => handleSizeChange(product, e.target.value, quantity)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full px-2 md:px-3 py-2 md:py-2.5 border rounded focus:outline-none focus:ring focus:border-primary text-xs md:text-sm mb-3"
                      />
                      {/* Quantity Controls */}
                  {quantity > 0 ? (
  <div className="flex flex-col gap-2 mt-2">
    <div className="flex items-center bg-white/10 backdrop-blur-lg border border-white/20 rounded-full shadow-sm overflow-hidden w-full sm:w-auto justify-between">
      <Button
        variant="ghost"
        size="icon"
        className="rounded-none hover:bg-white/20 transition"
        onClick={(e) => {
          e.stopPropagation();
          const newQty = Math.max(0, quantity - 1);
          updateQuantity(product.id, newQty);
          // Update size input to reflect new quantity
          setSizeInputs((prev) => ({ ...prev, [product.id]: newQty > 0 ? newQty.toString() : "" }));
        }}
      >
        <Minus className="w-4 h-4" />
      </Button>
      <span className="px-3 md:px-4 text-sm md:text-base font-semibold">{quantity}</span>
      <Button
        variant="ghost"
        size="icon"
        className="rounded-none hover:bg-white/20 transition"
        onClick={(e) => {
          e.stopPropagation();
          const newQty = Math.min(999999, quantity + 1);
          updateQuantity(product.id, newQty);
          // Update size input to reflect new quantity
          setSizeInputs((prev) => ({ ...prev, [product.id]: newQty > 0 ? newQty.toString() : "" }));
        }}
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>

    <Button
      size="lg"
      className={`w-full p-2 md:p-2.5 text-white font-semibold shadow-lg rounded transition-all duration-200 text-xs md:text-sm ${
        isBelowMOQ
          ? "bg-gray-400 cursor-not-allowed"
          : "bg-primary hover:bg-primary-dark hover:shadow-xl hover:scale-[1.02]"
      }`}
      onClick={(e) => {
        e.stopPropagation();
        navigate("/cart");
      }}
      disabled={isBelowMOQ}
    >
      Buy Now
    </Button>
  </div>
) : (
  <Button
    variant="outline"
    size="sm"
    className="w-full hover-scale text-xs md:text-sm py-2 md:py-2.5"
    onClick={(e) => {
      e.stopPropagation();
      addToCart(
        {
          id: product.id,
          name: product.name,
          price: product.price - (product.discount / 100) * product.price,
          image: product.mainImage,
          category: product.category,
          shippingPrice: product.shippingPrice,
        },
        sizeInputs[product.id] || ""
      );
    }}
  >
    Add to Cart
  </Button>
)}


                      {/* MOQ Warning */}
                      {isBelowMOQ && (
                        <p className="mt-2 text-red-600 text-xs md:text-sm font-semibold text-center">
                          Order Quantity must be at least {moq} Pcs
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default FeatureCategories;
