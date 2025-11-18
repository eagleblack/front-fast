import { useEffect, useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const Checkout = () => {
  const { cartItems, clearCart } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { user, userData } = useAuth();

  // User form state
  const [userDetails, setUserDetails] = useState({
    name: "",
    email: "",
    phone: "",
  });  
   useEffect(() => {
     if (userData) setUserDetails({ ...userDetails, ...userData });
   }, [userData]);
  const totalAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // IMPORTANT: Replace this with your actual Firebase Function URL after deployment
  const FIREBASE_FUNCTION_URL = "https://fir-admin-d1ae6.web.app/api";

  const handlePayment = async () => {
    // Validation
    if (cartItems.length === 0) {
      toast({ 
        title: "Cart is empty", 
        description: "Add some items before checkout.",
        variant: "destructive"
      });
      return;
    }

    if (!userDetails.name || !userDetails.email || !userDetails.phone) {
      toast({ 
        title: "Missing details", 
        description: "Please fill in all your details.",
        variant: "destructive"
      });
      return;
    }

    // Validate phone number (10 digits)
    if (!/^\d{10}$/.test(userDetails.phone)) {
      toast({ 
        title: "Invalid phone", 
        description: "Please enter a valid 10-digit phone number.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const orderId = `ORD_${Date.now()}`;
      
      // Store order in localStorage temporarily (you can also store in Firebase)
      const orderData = {
        orderId,
        items: cartItems,
        totalAmount,
        userDetails,
        createdAt: new Date().toISOString(),
        status: "PENDING"
      };
      localStorage.setItem(`order_${orderId}`, JSON.stringify(orderData));

      const body = {
        amount: totalAmount, // Send in rupees, backend converts to paise
        orderId: orderId,
        userId: userDetails.uid??`USER_${Date.now()}`, // In production, use actual user ID from auth
        userPhone: userDetails.phone,
        userName: userDetails.name,
        userEmail: userDetails.email,
        items: cartItems,
        redirectUrl: `${window.location.origin}/payment-status?orderId=${orderId}`
      };

      console.log("Payment Request:", body);

      const response = await fetch(`${FIREBASE_FUNCTION_URL}/createPayment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      console.log("Payment Response:", data);
      console.log(response)
      if (data.success && data.redirectUrl) {
        toast({
          title: "Redirecting to PhonePe...",
          description: "Please complete your payment on the PhonePe page.",
        });

        // Clear cart before redirecting
        clearCart();

        // Redirect to PhonePe payment page
        setTimeout(() => {
          window.location.href = data.redirectUrl;
        }, 1000);
      } else {
        toast({
          title: "Payment Initiation Failed",
          description: data.message || "Something went wrong. Please try again.",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error("Payment Error:", err);
      toast({
        title: "Error",
        description: "Unable to connect to the payment server. Please check your internet connection.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6">Checkout</h1>

      {/* Order Summary */}
      <div className="border rounded-lg p-6 mb-6 bg-white shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
        {cartItems.length === 0 ? (
          <p className="text-gray-500">Your cart is empty</p>
        ) : (
          <>
            {cartItems.map((item) => (
              <div key={item.id} className="flex justify-between mb-3 pb-3 border-b">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                </div>
                <span className="font-semibold">₹{item.price * item.quantity}</span>
              </div>
            ))}
            <div className="pt-3 flex justify-between text-lg font-bold">
              <span>Total Amount</span>
              <span className="text-indigo-600">₹{totalAmount}</span>
            </div>
          </>
        )}
      </div>

      {/* User Details Form */}
      <div className="border rounded-lg p-6 mb-6 bg-white shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Your Details</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Full Name *</label>
            <input
              type="text"
              value={userDetails.name}
              onChange={(e) => setUserDetails({ ...userDetails, name: e.target.value })}
              placeholder="Enter your full name"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email *</label>
            <input
              type="email"
              value={userDetails.email}
              onChange={(e) => setUserDetails({ ...userDetails, email: e.target.value })}
              placeholder="your.email@example.com"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Phone Number *</label>
            <input
              type="tel"
              value={userDetails.phone}
              onChange={(e) => setUserDetails({ ...userDetails, phone: e.target.value.replace(/\D/g, '') })}
              placeholder="9999999999"
              maxLength={10}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1">10 digit mobile number</p>
          </div>
        </div>
      </div>

      {/* Payment Button */}
      <button
        onClick={handlePayment}
        disabled={loading || cartItems.length === 0}
        className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
            </svg>
            Pay ₹{totalAmount} with PhonePe
          </>
        )}
      </button>

      <p className="text-center text-sm text-gray-500 mt-4">
        Secure payment powered by PhonePe
      </p>
    </div>
  );
};

export default Checkout;