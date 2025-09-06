# Sample Python script for testing PDF conversion
import datetime
import math

def calculate_area(radius):
    """Calculate the area of a circle with the given radius."""
    return math.pi * radius ** 2

def calculate_volume(radius, height):
    """Calculate the volume of a cylinder with the given radius and height."""
    return calculate_area(radius) * height

def main():
    """Main function to demonstrate Python code."""
    print("Sample Python Script")
    print(f"Current date and time: {datetime.datetime.now()}")

    # Calculate some values
    radius = 5
    height = 10
    area = calculate_area(radius)
    volume = calculate_volume(radius, height)

    print(f"Circle with radius {radius}: Area = {area:.2f} square units")
    print(f"Cylinder with radius {radius} and height {height}: Volume = {volume:.2f} cubic units")

if __name__ == "__main__":
    main()
