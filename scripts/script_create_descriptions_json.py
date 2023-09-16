import os
import json

##################################################################################################
#
# This script read all techonolgoies descriptions from wappalyzer/src/technologies directory
# and creates a JSON file with the keys and descriptions
#
##################################################################################################

# Define the directory path
directory_path = "../../wappalyzer/src/technologies"

# Initialize a dictionary to store the keys and descriptions
key_description_dict = {}

# Loop through all the files in the directory
for filename in os.listdir(directory_path):
    if filename.endswith(".json"):
        file_path = os.path.join(directory_path, filename)
        
        # Open and parse the JSON file
        with open(file_path, 'r', encoding='utf-8') as json_file:
            data = json.load(json_file)
            
            # Loop through the keys in the JSON data
            for key, value in data.items():
                if 'description' in value:
                    key_description_dict[key] = value['description']

# Define the path for the output JSON file
output_file_path = "key_description.json"

# Save the keys and descriptions in the output JSON file
with open(output_file_path, 'w', encoding='utf-8') as output_file:
    json.dump(key_description_dict, output_file, indent=4)

print(f"Keys and descriptions saved to {output_file_path}")
