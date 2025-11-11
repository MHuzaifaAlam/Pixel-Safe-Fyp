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

        
# class LoginSerializer(serializers.Serializer):
#     username = serializers.CharField()
#     password = serializers.CharField(write_only=True)

#     def validate(self, data):
#         username = data.get('username')
#         password = data.get('password')

#         user = authenticate(username=username,password=password)
#         if user and user.is_active:
#             data['user'] = user
#             return data
#         raise serializers.ValidationError("Invalid credentials or inactive account.")