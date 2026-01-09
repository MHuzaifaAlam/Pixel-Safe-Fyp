from django.contrib.auth.models import User
from rest_framework import serializers
from django.contrib.auth import authenticate

class Userserializer(serializers.ModelSerializer):
    class Meta:
        model=User
        fields='__all__'
        extra_kwargs = {
            'password':{'write_only':True}
        }
        
    def create(self,validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email',''),
            password=validated_data['password']
        )
        return user

        
