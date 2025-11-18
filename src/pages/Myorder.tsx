import React, { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface Order {
  id: string;
  orderId: string;
  createdAt?: any;
  total: number;
  paymentStatus: string;
  cartItems: {
    id: string;
    name: string;
    price: number;
    mrp?: number;
    quantity: number;
    image?: string;
  }[];
}

const MyOrders: React.FC = () => {
  const { userData } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  useEffect(() => {
    if (!userData?.uid) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const fetchOrders = async () => {
      try {
        const q = query(
          collection(db, "transactions"),
          where("userId", "==", userData.uid),
          orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setOrders([]);
        } else {
          const data = snapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() } as Order)
          );
          console.log(data)
         setOrders(data);
        }
      } catch (err) {
        console.error("Error fetching orders:", err);
        setOrders([]); // fallback to empty so UI won't hang
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [userData]);

  // Payment verification
  const verifyPayment = async (orderId: string, total: number) => {
    setVerifyingId(orderId);
    try { 
      const res = await fetch(
        "https://verifypaypalorder-axakdkxv5a-uc.a.run.app/verifyPayPalOrder",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            amount: total,
            currency: "USD",
          }),
        }
      );

      const data = await res.json();
      console.log("Verification result:", data);

      if (res.ok && data.paymentStatus) {
        setOrders((prev) =>
          prev.map((order) =>
            order.orderId === orderId
              ? { ...order, paymentStatus: data.paymentStatus }
              : order
          )
        );
      } else {
        console.warn("Verification failed:", data);
      }
    } catch (err) {
      console.error("Error verifying order:", err);
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <Navbar />

      <main className="flex-grow container mx-auto px-4 py-12 mt-10">
        <h1 className="text-4xl font-extrabold text-center mb-12 text-primary">
          My Orders
        </h1>

        {loading ? (
          <p className="text-center text-gray-500">Loading your orders...</p>
        ) : orders.length === 0 ? (
          <p className="text-center text-gray-500">No orders found.</p>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-gray-200 flex flex-col"
              >
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs text-gray-500">
                    {order.createdAt?.seconds
                      ? format(order.createdAt.toDate(), "PPP p")
                      : "No date"}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      order.paymentStatus === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>

                <h2 className="text-lg font-bold mb-2">
                  Order #{order.orderId ?? order.merchantOrderId }
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  Total:{" "}
                  <span className="font-semibold text-gray-800">
                    Rs {order.amount.toFixed(2)}
                  </span>
                </p>

                <div className="flex flex-col gap-3 mb-4">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 border-b border-gray-100 pb-3 last:border-0"
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                          No Img
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-gray-500">
                          Qty: {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          Rs {(item.price * item.quantity).toFixed(2)}
                        </span>
                        {item.mrp && item.mrp > item.price && (
                          <span className="text-xs text-gray-400 line-through">
                            Rs {(item.mrp * item.quantity).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {order.paymentStatus === "pending" && (
                  <button
                    onClick={() => verifyPayment(order.orderId, order.total)}
                    disabled={verifyingId === order.orderId}
                    className={`mt-auto px-4 py-2 rounded-lg font-semibold text-white transition ${
                      verifyingId === order.orderId
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-primary hover:bg-primary-dark"
                    }`}
                  >
                    {verifyingId === order.orderId
                      ? "Verifying..."
                      : "Verify Payment"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default MyOrders;
