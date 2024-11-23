import json

import environ
import razorpay
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Order,Subscription
from .serializers import OrderSerializer,SubscriptionSerializer

env = environ.Env()

# you have to create .env file in same folder where you are using environ.Env()
# reading .env file which located in api folder
environ.Env.read_env()


@api_view(['POST'])
def start_payment(request):
    subscription_id = request.data['subscription_id']
    subscription = Subscription.objects.get(id=subscription_id)

    client = razorpay.Client(auth=(env('PUBLIC_KEY'), env('SECRET_KEY')))
    payment = client.order.create({
        "amount": int(subscription.price) * 100,
        "currency": "INR",
        "payment_capture": "1"
    })

    order = Order.objects.create(
        subscription=subscription,
        order_payment_id=payment['id']
    )

    serializer = OrderSerializer(order)

    data = {
        "payment": payment,
        "order": serializer.data
    }
    return Response(data)


@api_view(['POST'])
def handle_payment_success(request):
    # request.data is coming from frontend
    res = json.loads(request.data["response"])

    """res will be:
    {'razorpay_payment_id': 'pay_G3NivgSZLx7I9e', 
    'razorpay_order_id': 'order_G3NhfSWWh5UfjQ', 
    'razorpay_signature': '76b2accbefde6cd2392b5fbf098ebcbd4cb4ef8b78d62aa5cce553b2014993c0'}
    this will come from frontend which we will use to validate and confirm the payment
    """

    ord_id = ""
    raz_pay_id = ""
    raz_signature = ""

    # res.keys() will give us list of keys in res
    for key in res.keys():
        if key == 'razorpay_order_id':
            ord_id = res[key]
        elif key == 'razorpay_payment_id':
            raz_pay_id = res[key]
        elif key == 'razorpay_signature':
            raz_signature = res[key]

    # get order by payment_id which we've created earlier with isPaid=False
    order = Order.objects.get(order_payment_id=ord_id)

    # we will pass this whole data in razorpay client to verify the payment
    data = {
        'razorpay_order_id': ord_id,
        'razorpay_payment_id': raz_pay_id,
        'razorpay_signature': raz_signature
    }

    client = razorpay.Client(auth=(env('PUBLIC_KEY'), env('SECRET_KEY')))

    # checking if the transaction is valid or not by passing above data dictionary in 
    # razorpay client if it is "valid" then check will return None
    check = client.utility.verify_payment_signature(data)

    if check is not None:
        print("Redirect to error url or error page")
        return Response({'error': 'Something went wrong'})

    # if payment is successful that means check is None then we will turn isPaid=True
    order.isPaid = True
    order.save()

    res_data = {
        'message': 'payment successfully received!'
    }

    return Response(res_data)



@api_view(['GET'])
def list_subscriptions(request):
    subscriptions = Subscription.objects.all()
    serializer = SubscriptionSerializer(subscriptions, many=True)
    return Response(serializer.data)