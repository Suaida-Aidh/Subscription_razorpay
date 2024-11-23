import Axios from "axios";
import { useState, useEffect } from "react";
import { server } from "./server"; // Replace with your backend URL
import { REACT_APP_PUBLIC_KEY } from './env'; // Ensure you have the public key set up in your `.env` file

function App() {
  const [subscriptions, setSubscriptions] = useState([]); // To store the list of subscriptions
  const [selectedSubscription, setSelectedSubscription] = useState(null); // To track the selected subscription

  // Fetch subscriptions from the backend on component mount
  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        const response = await Axios.get(`${server}/razorpay/subscriptions/`);
        setSubscriptions(response.data); // Assuming the backend returns a list of subscriptions
      } catch (error) {
        console.error("Error fetching subscriptions:", error);
      }
    };
    fetchSubscriptions();
  }, []);

  // This function will handle successful payments
  const handlePaymentSuccess = async (response) => {
    try {
      let bodyData = new FormData();

      // Pass the Razorpay response to the backend for verification
      bodyData.append("response", JSON.stringify(response));
      bodyData.append("subscription_id", selectedSubscription.id);

      await Axios({
        url: `${server}/razorpay/payment/success/`,
        method: "POST",
        data: bodyData,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })
        .then((res) => {
          alert("Payment successful!");
          setSelectedSubscription(null); // Reset the selected subscription
        })
        .catch((err) => {
          console.error(err);
        });
    } catch (error) {
      console.error(error);
    }
  };

  // Load Razorpay's checkout script
  const loadScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const showRazorpay = async () => {
    const res = await loadScript();

    if (!res) {
      alert("Razorpay SDK failed to load. Please check your connection.");
      return;
    }

    if (!selectedSubscription) {
      alert("Please select a subscription to proceed.");
      return;
    }

    // Send the selected subscription details to the backend to create an order
    let bodyData = new FormData();
    bodyData.append("subscription_id", selectedSubscription.id);

    const data = await Axios({
      url: `${server}/razorpay/pay/`,
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      data: bodyData,
    }).then((res) => res);

    // Configure Razorpay options
    var options = {
      key: REACT_APP_PUBLIC_KEY, // Use your Razorpay public key
      amount: data.data.payment.amount,
      currency: "INR",
      name: "Subscription Payment",
      description: selectedSubscription.name,
      order_id: data.data.payment.id,
      handler: function (response) {
        handlePaymentSuccess(response); // Handle success callback
      },
      prefill: {
        name: "User Name", // Replace with user details
        email: "user@example.com",
        contact: "1234567890",
      },
      theme: {
        color: "#3399cc",
      },
    };

    var rzp1 = new window.Razorpay(options);
    rzp1.open();
  };

  return (
    <div className="container" style={{ marginTop: "20vh" }}>
      <h1>Subscription Payment</h1>
      <div>
        <h3>Select a subscription to pay for:</h3>
        {subscriptions.length === 0 ? (
          <p>Loading subscriptions...</p>
        ) : (
          <ul>
            {subscriptions.map((subscription) => (
              <li key={subscription.id}>
                <input
                  type="radio"
                  id={`subscription-${subscription.id}`}
                  name="subscription"
                  value={subscription.id}
                  onChange={() => setSelectedSubscription(subscription)}
                />
                <label htmlFor={`subscription-${subscription.id}`}>
                  {subscription.name} - ₹{subscription.amount}
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button
        onClick={showRazorpay}
        className="btn btn-primary"
        disabled={!selectedSubscription}
      >
        Pay with Razorpay
      </button>
    </div>
  );
}

export default App;
