import { useEffect, useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, ShoppingBag } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { useWebflow } from "@/contexts/WebflowContext";
import { useLoginModal } from "@/contexts/LoginModalContext";

// --- Countries list ---
const countries = [
  "India"
];

// --- Empty Cart Component ---
const EmptyCart = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center pt-16">
        <div className="container mx-auto px-4 py-16 text-center">
          <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
          <p className="text-muted-foreground mb-6">
            Looks like you haven't added anything to your cart yet.
          </p>
          <Button onClick={() => navigate("/product")}>Start Shopping</Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

// --- Cart Items Component ---
const CartItems = ({ cartItems, removeFromCart, getCartTotal, getShippingTotal, startCheckout }) => {
  const shippingTotal = getShippingTotal();
  const total = getCartTotal() + shippingTotal;

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-4">
        {cartItems.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-4 flex items-center space-x-4">
              <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-lg" />
              <div className="flex-1">
                <h3 className="font-semibold">{item.name}</h3>
                <p className="text-sm text-muted-foreground capitalize">{item.category.replace("-", " ")}</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-primary">
                    Rs {item.price.toLocaleString()}
                  </span>
                  {item.mrp && item.mrp > item.price && (
                    <span className="text-sm text-muted-foreground line-through">
                      Rs {item.mrp.toLocaleString()}
                    </span>
                  )}
                  <span className="text-sm text-muted-foreground">
                    + Rs {item.shippingPrice?.toLocaleString() || 0} shipping
                  </span>
                </div>
              </div>
              <span className="w-8 text-center">{item.quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeFromCart(item.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="lg:col-span-1">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>Rs {getCartTotal().toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping:</span>
                <span>Rs {shippingTotal.toLocaleString()}</span>
              </div>
              <hr />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total:</span>
                <span>Rs {total.toLocaleString()}</span>
              </div>
            </div>
            <Button className="w-full" onClick={startCheckout}>
              Proceed to Checkout
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// --- Checkout Form Component ---
const CheckoutForm = ({ cartItems, customerInfo, handleInputChange, handlePlaceOrder, setIsCheckout, getCartTotal, getShippingTotal }) => {
  const total = getCartTotal() + getShippingTotal();

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Billing Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { id: "name", label: "Full Name *", type: "text" },
                { id: "email", label: "Email *", type: "email" },
                { id: "phone", label: "Phone Number *", type: "text" },
                { id: "city", label: "City", type: "text" },
                { id: "pincode", label: "Pincode", type: "text" }
              ].map(({ id, label, type }) => (
                <div key={id}>
                  <Label htmlFor={id}>{label}</Label>
                  <Input
                    id={id}
                    type={type}
                    value={customerInfo[id as keyof typeof customerInfo]}
                    onChange={(e) => handleInputChange(id, e.target.value)}
                    placeholder={`Enter your ${label.toLowerCase()}`}
                  />
                </div>
              ))}
              <div>
                <Label htmlFor="country">Country *</Label>
                <select
                  id="country"
                  className="border rounded-md w-full px-3 py-2"
                  value={customerInfo.country || ""}
                  onChange={(e) => handleInputChange("country", e.target.value)}
                >
                  <option value="">Select your country</option>
                  {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="address">Address *</Label>
                <Textarea
                  id="address"
                  value={customerInfo.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Enter your complete address"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="notes">Special Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={customerInfo.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Any special instructions or notes"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
            <div className="space-y-2 mb-4">
              <hr />
              <div className="flex justify-between font-semibold">
                <span>Total:</span>
                <span>Rs {total.toLocaleString()}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Button className="w-full" onClick={handlePlaceOrder}>
                Place Order
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setIsCheckout(false)}>
                Back to Cart
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// --- Main Cart Component ---
export default function Cart() {
  const [showMinOrderPopup, setShowMinOrderPopup] = useState(false);
  const { webflowData } = useWebflow();
  const { isLoginOpen, openLogin } = useLoginModal();
  const { cartItems, removeFromCart, getCartTotal, getShippingTotal } = useCart();
  const { toast } = useToast();
  const { user, userData } = useAuth();
  const navigate = useNavigate();
  const [isCheckout, setIsCheckout] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: "", email: "", phone: "", address: "", city: "", pincode: "", notes: "", country: ""
  });

  useEffect(() => {
    if (userData) setCustomerInfo({ ...customerInfo, ...userData });
  }, [userData]);

  const handleInputChange = (field, value) => setCustomerInfo(prev => ({ ...prev, [field]: value }));

  const startCheckout = () => {
    if (!user) return openLogin();
    //if (getCartTotal() < webflowData.minimumPurchaseAmount) return setShowMinOrderPopup(true);
    setIsCheckout(true);
  };

  const handlePlaceOrder = async () => {
    const required = ["name", "email", "phone", "address", "country"];
    if (required.some(f => !customerInfo[f])) {
      return toast({ title: "Missing Information", description: "Please fill in all required fields.", variant: "destructive" });
    }

    try {
      if (user?.uid) {
        const updates = {};
        Object.keys(customerInfo).forEach(key => {
          if (customerInfo[key] !== userData?.[key]) updates[key] = customerInfo[key];
        });
        if (Object.keys(updates).length > 0) await updateDoc(doc(db, "users", user.uid), updates);
      }
     toast({
  title: "Redirecting to PhonePe...",
  description: "Please wait while we prepare your payment.",
});
setIsCheckout(false);
navigate("/checkout");

    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Could not proceed to payment. Try again.", variant: "destructive" });
    }
  };

  if (cartItems.length === 0) return <EmptyCart />;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="pt-16 flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 mt-10">
          {isCheckout ? "Checkout 💳" : "Your Cart 🛒"}
        </h1>

        {isCheckout ? (
          <CheckoutForm
            cartItems={cartItems}
            customerInfo={customerInfo}
            handleInputChange={handleInputChange}
            handlePlaceOrder={handlePlaceOrder}
            setIsCheckout={setIsCheckout}
            getCartTotal={getCartTotal}
            getShippingTotal={getShippingTotal}
          />
        ) : (
          <CartItems
            cartItems={cartItems}
            removeFromCart={removeFromCart}
            getCartTotal={getCartTotal}
            getShippingTotal={getShippingTotal}
            startCheckout={startCheckout}
          />
        )}
      </main>
      <Footer />

      <AlertDialog open={showMinOrderPopup} onOpenChange={setShowMinOrderPopup}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Minimum Order Not Met 🚫</AlertDialogTitle>
            <AlertDialogDescription>
              Your current order total is <strong>Rs {getCartTotal().toLocaleString()}</strong>.  
              A minimum order of <strong>Rs 1000</strong> is required to checkout.  
              Add more items to continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowMinOrderPopup(false)}>Close</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowMinOrderPopup(false); navigate("/product"); }}>
              More Items 🛍️
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
