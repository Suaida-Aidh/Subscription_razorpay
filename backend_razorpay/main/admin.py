from django.contrib import admin

from .models import Order,Subscription

admin.site.register(Order)
admin.site.register(Subscription)