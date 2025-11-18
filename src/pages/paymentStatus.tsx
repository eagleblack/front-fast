import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import Navbar from "@/components/Navbar";

const PaymentStatus = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<{
    success: boolean;
    message: string;
    orderId: string;
    amount?: number;
    transactionId?: string;
  } | null>(null);
 
  const orderId = searchParams.get("orderId");

  // Replace with your Firebase Function URL
  const FIREBASE_FUNCTION_URL =
    "https://fir-admin-d1ae6.web.app/api";

  useEffect(() => {
    if (!orderId) {
      toast({
        title: "Invalid Request",
        description: "No order ID found",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    checkPaymentStatus();
  }, [orderId]);

  const checkPaymentStatus = async () => {
    try {
      setLoading(true);

      // Allow callback to process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const response = await fetch(`${FIREBASE_FUNCTION_URL}/checkPaymentStatus`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          merchantTransactionId: orderId,
        }),
      });

      const data = await response.json();
      console.log("Payment Status Response:", data);

      if (data.success) {
        // Handle PhonePe V2 style response
        const responseData = data.data;
    const state =
  responseData?.state || 
  data.status || 
  responseData?.code;

        switch (state) {
          case "COMPLETED":
          case "PAYMENT_SUCCESS":
            setPaymentStatus({
              success: true,
              message: "Payment Successful!",
              orderId: orderId!,
              amount: responseData?.amount ? responseData.amount / 100 : undefined,
              transactionId:
                responseData?.paymentDetails?.[0]?.transactionId ||
                responseData?.transactionId,
            });

            toast({
              title: "Payment Successful!",
              description: "Your order has been confirmed.",
            });
            break;

          case "PENDING":
          case "PAYMENT_PENDING":
            setPaymentStatus({
              success: false,
              message: "Payment is pending. Please wait...",
              orderId: orderId!,
            });

            // Retry check after 3s
            setTimeout(() => checkPaymentStatus(), 3000);
            break;

          case "FAILED":
          case "PAYMENT_FAILED":
            setPaymentStatus({
              success: false,
              message: "Payment Failed",
              orderId: orderId!,
            });

            toast({
              title: "Payment Failed",
              description: "Transaction failed. Please try again.",
              variant: "destructive",
            });
            break;

          case "CANCELLED":
          case "USER_CANCELLED":
            setPaymentStatus({
              success: false,
              message: "Payment Cancelled by User",
              orderId: orderId!,
            });

            toast({
              title: "Payment Cancelled",
              description: "You cancelled the payment process.",
              variant: "destructive",
            });
            break;

          default:
            setPaymentStatus({
              success: false,
              message: "Unknown payment status",
              orderId: orderId!,
            });

            toast({
              title: "Payment Status Unknown",
              description: "Unable to determine the payment status.",
              variant: "destructive",
            });
        }
      } else {
        setPaymentStatus({
          success: false,
          message: "Unable to verify payment status",
          orderId: orderId!,
        });
      }
    } catch (error) {
      console.error("Error checking payment status:", error);
      setPaymentStatus({
        success: false,
        message: "Error verifying payment",
        orderId: orderId!,
      });

      toast({
        title: "Error",
        description: "Unable to verify payment status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getOrderDetails = () => {
    if (!orderId) return null;
    const orderData = localStorage.getItem(`order_${orderId}`);
    return orderData ? JSON.parse(orderData) : null;
  };

  const orderDetails = getOrderDetails();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Verifying Payment...</h2>
          <p className="text-gray-500">Please wait while we confirm your payment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
    <Navbar />
      <div className="max-w-2xl mx-auto">
        {paymentStatus?.success ? (
          // ✅ Success
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-10 h-10 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-green-600 mb-2">
                Payment Successful!
              </h1>
              <p className="text-gray-600">
                Thank you for your purchase. Your order has been confirmed.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
              <h3 className="font-semibold mb-3">Order Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order ID:</span>
                  <span className="font-mono font-semibold">
                    {paymentStatus.orderId}
                  </span>
                </div>
                {paymentStatus.transactionId && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transaction ID:</span>
                    <span className="font-mono text-xs">
                      {paymentStatus.transactionId}
                    </span>
                  </div>
                )}
                {paymentStatus.amount && (
                  <div className="flex justify-between text-lg font-bold text-indigo-600">
                    <span>Amount Paid:</span>
                    <span>₹{paymentStatus.amount}</span>
                  </div>
                )}
              </div>
            </div>

            {orderDetails && (
              <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
                <h3 className="font-semibold mb-3">Items Ordered</h3>
                <div className="space-y-2">
                  {orderDetails.items.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>
                        {item.name} x {item.quantity}
                      </span>
                      <span>₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => navigate("/orders")}
                className="flex-1 bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700"
              >
                View Orders
              </button>
              <button
                onClick={() => navigate("/")}
                className="flex-1 bg-gray-200 text-gray-800 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        ) : (
          // ❌ Failed / Pending / Cancelled
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mb-6">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-10 h-10 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-red-600 mb-2">
                {paymentStatus?.message || "Payment Failed"}
              </h1>
              <p className="text-gray-600">
                {paymentStatus?.message === "Payment is pending. Please wait..."
                  ? "Your payment is being processed. This page will update automatically."
                  : "Unfortunately, your payment could not be processed. Please try again."}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
              <h3 className="font-semibold mb-3">Order Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order ID:</span>
                  <span className="font-mono font-semibold">
                    {paymentStatus?.orderId}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => navigate("/checkout")}
                className="flex-1 bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate("/")}
                className="flex-1 bg-gray-200 text-gray-800 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300"
              >
                Back to Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentStatus;
