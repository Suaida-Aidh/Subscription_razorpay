from rest_framework import serializers
from .models import Order, Subscription

class SubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscription
        fields = '__all__'

class OrderSerializer(serializers.ModelSerializer):
    subscription = SubscriptionSerializer()
    order_date = serializers.DateTimeField(format="%d %B %Y %I:%M %p")

    class Meta:
        model = Order
        fields = '__all__'
