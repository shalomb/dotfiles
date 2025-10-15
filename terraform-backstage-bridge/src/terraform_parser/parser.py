"""
Terraform Variables Parser

This module parses Terraform variables.tf files and represents variable types
as complex Python objects using python-hcl2.
"""

import json
import warnings
from pathlib import Path
from typing import Any

import hcl2


class TerraformType:
    """Base class for Terraform types"""

    def __init__(self, raw_type: Any):
        self.raw_type = raw_type

    def __repr__(self):
        return f"{self.__class__.__name__}({self.raw_type})"


class PrimitiveType(TerraformType):
    """Represents primitive types: string, number, bool"""

    def __init__(self, type_name: str):
        super().__init__(type_name)
        self.type_name = type_name

    def __repr__(self):
        return f"PrimitiveType('{self.type_name}')"


class ListType(TerraformType):
    """Represents list(T) types"""

    def __init__(self, element_type: TerraformType):
        super().__init__(f"list({element_type})")
        self.element_type = element_type

    def __repr__(self):
        return f"ListType({self.element_type})"


class SetType(TerraformType):
    """Represents set(T) types"""

    def __init__(self, element_type: TerraformType):
        super().__init__(f"set({element_type})")
        self.element_type = element_type

    def __repr__(self):
        return f"SetType({self.element_type})"


class MapType(TerraformType):
    """Represents map(T) types"""

    def __init__(self, value_type: TerraformType):
        super().__init__(f"map({value_type})")
        self.value_type = value_type

    def __repr__(self):
        return f"MapType({self.value_type})"


class ObjectType(TerraformType):
    """Represents object({...}) types"""

    def __init__(self, attributes: dict[str, TerraformType]):
        super().__init__(f"object({attributes})")
        self.attributes = attributes

    def __repr__(self):
        attrs_str = ", ".join([f"{k}: {v}" for k, v in self.attributes.items()])
        return f"ObjectType({{{attrs_str}}})"


class TupleType(TerraformType):
    """Represents tuple([...]) types"""

    def __init__(self, element_types: list[TerraformType]):
        super().__init__(f"tuple({element_types})")
        self.element_types = element_types

    def __repr__(self):
        elements_str = ", ".join([str(t) for t in self.element_types])
        return f"TupleType([{elements_str}])"


class AnyType(TerraformType):
    """Represents the 'any' type"""

    def __init__(self):
        super().__init__("any")

    def __repr__(self):
        return "AnyType()"


class OptionalType(TerraformType):
    """Represents optional(type) or optional(type, default) types"""

    def __init__(
        self,
        inner_type: TerraformType,
        default_value: Any = None,
        explicit_default: bool = False,
    ):
        type_str = f"optional({inner_type})"
        if explicit_default:
            type_str = f"optional({inner_type}, {default_value!r})"
        super().__init__(type_str)
        self.inner_type = inner_type
        self.default_value = default_value
        self.has_default = explicit_default

    def __str__(self):
        # For string representation, use type_name for primitive types, otherwise use str()
        if isinstance(self.inner_type, PrimitiveType):
            inner_str = self.inner_type.type_name
        else:
            inner_str = str(self.inner_type)

        if self.has_default:
            return f"optional({inner_str}, {self.default_value!r})"
        return f"optional({inner_str})"

    def __repr__(self):
        if self.has_default:
            return f"OptionalType({self.inner_type}, default={self.default_value!r})"
        return f"OptionalType({self.inner_type})"


class TerraformVariable:
    """Represents a complete Terraform variable definition"""

    def __init__(self, name: str, variable_def: dict[str, Any]):
        self.name = name
        self.description = variable_def.get("description", "")
        self.default = variable_def.get("default")
        self.sensitive = variable_def.get("sensitive", False)
        self.nullable = variable_def.get("nullable", True)
        self.validation = variable_def.get("validation", [])

        # Parse the type
        type_def = variable_def.get("type")
        if type_def:
            self.type = self._parse_type(type_def)
        else:
            # Infer type from default value if no type is specified
            self.type = self._infer_type_from_default(self.default)

    def _parse_type(self, type_def: Any) -> TerraformType:
        """Parse a Terraform type definition into a TerraformType object"""
        if isinstance(type_def, str):
            # Handle interpolated strings from python-hcl2 (e.g., "${list(string)}")
            type_str = type_def.strip()
            if type_str.startswith("${") and type_str.endswith("}"):
                type_str = type_str[2:-1]  # Remove ${ and }

            # Simple string types
            if type_str in ["string", "number", "bool"]:
                return PrimitiveType(type_str)
            elif type_str == "any":
                warnings.warn(
                    f"Variable '{self.name}' uses 'any' type which is probably mis-typed. "
                    "Consider using a more specific type (string, number, bool, list, map, object, etc.). "
                    "Please raise a bug to update this variable's type definition.",
                    UserWarning,
                    stacklevel=3,
                )
                return AnyType()

            # Parse function calls in string format
            return self._parse_function_type(type_str)

        elif isinstance(type_def, list) and len(type_def) > 0:
            # Function call format: [function_name, args...]
            func_name = type_def[0]

            if func_name == "list":
                element_type = (
                    self._parse_type(type_def[1]) if len(type_def) > 1 else AnyType()
                )
                return ListType(element_type)

            elif func_name == "set":
                element_type = (
                    self._parse_type(type_def[1]) if len(type_def) > 1 else AnyType()
                )
                return SetType(element_type)

            elif func_name == "map":
                value_type = (
                    self._parse_type(type_def[1]) if len(type_def) > 1 else AnyType()
                )
                return MapType(value_type)

            elif func_name == "object":
                if len(type_def) > 1 and isinstance(type_def[1], dict):
                    attributes = {}
                    for attr_name, attr_type in type_def[1].items():
                        attributes[attr_name] = self._parse_type(attr_type)
                    return ObjectType(attributes)
                else:
                    return ObjectType({})

            elif func_name == "tuple":
                if len(type_def) > 1 and isinstance(type_def[1], list):
                    element_types = [self._parse_type(t) for t in type_def[1]]
                    return TupleType(element_types)
                else:
                    return TupleType([])

        elif isinstance(type_def, dict):
            # Object type definition
            attributes = {}
            for attr_name, attr_type in type_def.items():
                attributes[attr_name] = self._parse_type(attr_type)
            return ObjectType(attributes)

        # Default to any type
        warnings.warn(
            f"Variable '{self.name}' has unparseable type definition, falling back to 'any' type. "
            "This is probably due to an unsupported or mis-typed type definition. "
            "Please raise a bug to add support for this type or fix the type definition.",
            UserWarning,
            stacklevel=2,
        )
        return AnyType()

    def _parse_function_type(self, type_str: str) -> TerraformType:
        """Parse function-style type definitions from string format"""

        # Handle simple types
        if type_str in ["string", "number", "bool", "any"]:
            if type_str == "any":
                warnings.warn(
                    f"Variable '{self.name}' uses 'any' type which is probably mis-typed. "
                    "Consider using a more specific type (string, number, bool, list, map, object, etc.). "
                    "Please raise a bug to update this variable's type definition.",
                    UserWarning,
                    stacklevel=3,
                )
                return AnyType()
            return PrimitiveType(type_str)

        # Handle optional(type) or optional(type, default)
        if type_str.startswith("optional(") and type_str.endswith(")"):
            inner = type_str[9:-1]  # Extract content between optional( and )

            # Check if there's a default value (comma-separated)
            # We need to be careful about nested parentheses and quoted strings
            parts = self._split_optional_args(inner)

            if len(parts) == 1:
                # optional(type) - no default
                inner_type = self._parse_function_type(parts[0].strip())
                return OptionalType(inner_type)
            elif len(parts) == 2:
                # optional(type, default) - has default
                type_part = parts[0].strip()
                default_part = parts[1].strip()

                # Parse the inner type
                inner_type = self._parse_function_type(type_part)

                # Parse the default value
                default_value = self._parse_default_value(default_part)

                return OptionalType(inner_type, default_value, explicit_default=True)
            else:
                # Fallback for malformed optional
                return PrimitiveType(type_str)

        # Handle list(type)
        if type_str.startswith("list(") and type_str.endswith(")"):
            inner_type_str = type_str[5:-1]  # Extract content between list( and )
            return ListType(self._parse_function_type(inner_type_str))

        # Handle set(type)
        if type_str.startswith("set(") and type_str.endswith(")"):
            inner_type_str = type_str[4:-1]  # Extract content between set( and )
            return SetType(self._parse_function_type(inner_type_str))

        # Handle map(type)
        if type_str.startswith("map(") and type_str.endswith(")"):
            inner_type_str = type_str[4:-1]  # Extract content between map( and )
            return MapType(self._parse_function_type(inner_type_str))

        # Handle tuple([type1, type2, ...])
        if type_str.startswith("tuple([") and type_str.endswith("])"):
            inner = type_str[7:-2]  # Extract content between tuple([ and ])
            if inner.strip():
                # Split by comma and parse each type
                types_list = [t.strip() for t in inner.split(",")]
                element_types = [self._parse_function_type(t) for t in types_list]
                return TupleType(element_types)
            return TupleType([])

        # Handle object({...}) - this is more complex due to JSON-like structure
        if type_str.startswith("object({") and type_str.endswith("})"):
            inner = type_str[8:-2]  # Extract content between object({ and })
            try:
                # Try to parse as JSON-like structure
                import json

                # Replace single quotes with double quotes for JSON parsing
                json_str = inner.replace("'", '"')
                obj_def = json.loads("{" + json_str + "}")
                attributes = {}
                for attr_name, attr_type in obj_def.items():
                    # Handle nested interpolated strings
                    if isinstance(attr_type, str):
                        if attr_type.startswith("${") and attr_type.endswith("}"):
                            attr_type = attr_type[2:-1]  # Remove ${ and }
                        attributes[attr_name] = self._parse_function_type(
                            str(attr_type)
                        )
                    else:
                        attributes[attr_name] = self._parse_function_type(
                            str(attr_type)
                        )
                return ObjectType(attributes)
            except Exception:
                # If JSON parsing fails, try manual parsing for complex nested types
                return self._parse_complex_object(inner)

        # If we can't parse it, treat as a primitive type
        return PrimitiveType(type_str)

    def _parse_complex_object(self, inner: str) -> ObjectType:
        """Parse complex object types with nested interpolations"""

        attributes = {}

        # Try to extract key-value pairs manually
        # This is a simplified parser for the most common cases
        try:
            # Remove outer quotes and split by commas (but be careful with nested structures)
            pairs = []
            current_pair = ""
            depth = 0
            in_quotes = False
            escape_next = False

            for char in inner:
                if escape_next:
                    current_pair += char
                    escape_next = False
                    continue

                if char == "\\":
                    escape_next = True
                    current_pair += char
                    continue

                if char == '"' and not escape_next:
                    in_quotes = not in_quotes
                    current_pair += char
                    continue

                if not in_quotes:
                    if char in "({[":
                        depth += 1
                    elif char in ")}]":
                        depth -= 1
                    elif char == "," and depth == 0:
                        pairs.append(current_pair.strip())
                        current_pair = ""
                        continue

                current_pair += char

            if current_pair.strip():
                pairs.append(current_pair.strip())

            # Parse each key-value pair
            for pair in pairs:
                if ":" in pair:
                    key_part, value_part = pair.split(":", 1)
                    key = key_part.strip().strip('"')
                    value = value_part.strip()

                    # Handle interpolated values
                    if value.startswith('"${') and value.endswith('}"'):
                        value = value[3:-2]  # Remove "${...}"
                    elif value.startswith('"') and value.endswith('"'):
                        value = value[1:-1]  # Remove quotes

                    attributes[key] = self._parse_function_type(value)

            return ObjectType(attributes)

        except Exception:
            # If all parsing fails, return empty object
            return ObjectType({})

    def _split_optional_args(self, inner: str) -> list[str]:
        """Split optional function arguments, handling nested parentheses and quotes."""
        parts = []
        current_part = ""
        depth = 0
        in_quotes = False
        quote_char = None
        escape_next = False

        for char in inner:
            if escape_next:
                current_part += char
                escape_next = False
                continue

            if char == "\\" and in_quotes:
                escape_next = True
                current_part += char
                continue

            if char in ['"', "'"] and not in_quotes:
                in_quotes = True
                quote_char = char
                current_part += char
            elif char == quote_char and in_quotes:
                in_quotes = False
                quote_char = None
                current_part += char
            elif char == "(" and not in_quotes:
                depth += 1
                current_part += char
            elif char == ")" and not in_quotes:
                depth -= 1
                current_part += char
            elif char == "," and depth == 0 and not in_quotes:
                parts.append(current_part.strip())
                current_part = ""
            else:
                current_part += char

        if current_part.strip():
            parts.append(current_part.strip())

        return parts

    def _parse_default_value(self, default_str: str) -> Any:
        """Parse a default value from string representation."""
        default_str = default_str.strip()

        # Handle quoted strings
        if default_str.startswith('"') and default_str.endswith('"'):
            return default_str[1:-1]  # Remove quotes
        elif default_str.startswith("'") and default_str.endswith("'"):
            return default_str[1:-1]  # Remove quotes

        # Handle boolean values
        if default_str.lower() == "true":
            return True
        elif default_str.lower() == "false":
            return False

        # Handle null
        if default_str.lower() == "null":
            return None

        # Try to parse as number
        try:
            if "." in default_str:
                return float(default_str)
            else:
                return int(default_str)
        except ValueError:
            pass

        # Return as-is for complex values or unrecognized formats
        return default_str

    def _infer_type_from_default(self, default_value: Any) -> TerraformType:
        """Infer Terraform type from the default value when type is not specified"""
        if default_value is None:
            # null default - could be any type, default to any
            return AnyType()

        if isinstance(default_value, str):
            return PrimitiveType("string")

        if isinstance(default_value, bool):
            return PrimitiveType("bool")

        if isinstance(default_value, int | float):
            return PrimitiveType("number")

        if isinstance(default_value, list):
            # Infer list element type from first element if available
            if len(default_value) > 0:
                first_element = default_value[0]
                if isinstance(first_element, str):
                    return ListType(PrimitiveType("string"))
                elif isinstance(first_element, bool):
                    return ListType(PrimitiveType("bool"))
                elif isinstance(first_element, int | float):
                    return ListType(PrimitiveType("number"))
                elif isinstance(first_element, dict):
                    # Try to infer object structure from first element
                    attributes: dict[str, TerraformType] = {}
                    for key, value in first_element.items():
                        if isinstance(value, str):
                            attributes[key] = PrimitiveType("string")
                        elif isinstance(value, bool):
                            attributes[key] = PrimitiveType("bool")
                        elif isinstance(value, int | float):
                            attributes[key] = PrimitiveType("number")
                        else:
                            attributes[key] = AnyType()
                    return ListType(ObjectType(attributes))
                else:
                    return ListType(AnyType())
            else:
                # Empty list - can't infer element type
                return ListType(AnyType())

        if isinstance(default_value, dict):
            if len(default_value) > 0:
                # Try to infer map value type from first value
                first_value = next(iter(default_value.values()))
                if isinstance(first_value, str):
                    return MapType(PrimitiveType("string"))
                elif isinstance(first_value, bool):
                    return MapType(PrimitiveType("bool"))
                elif isinstance(first_value, int | float):
                    return MapType(PrimitiveType("number"))
                else:
                    return MapType(AnyType())
            else:
                # Empty dict - can't infer value type
                return MapType(AnyType())

        # For any other type, default to any
        warnings.warn(
            f"Variable '{self.name}' has unrecognized default value type '{type(default_value).__name__}', "
            "falling back to 'any' type. This might indicate an unsupported type. "
            "Please raise a bug to add support for this default value type.",
            UserWarning,
            stacklevel=2,
        )
        return AnyType()

    def to_dict(self) -> dict[str, Any]:
        """Convert the variable to a dictionary representation"""
        # Extract the actual type string for primitive types
        if hasattr(self.type, "type_name"):
            type_str = self.type.type_name
        else:
            type_str = str(self.type)

        return {
            "name": self.name,
            "type": type_str,
            "type_class": self.type.__class__.__name__,
            "description": self.description,
            "default": self.default,
            "sensitive": self.sensitive,
            "nullable": self.nullable,
            "validation": self.validation,
        }

    def __repr__(self):
        return f"TerraformVariable(name='{self.name}', type={self.type})"


class TerraformVariablesParser:
    """Parser for Terraform variables.tf files"""

    def __init__(self, file_path: str | Path):
        self.file_path = Path(file_path)
        self.variables: dict[str, TerraformVariable] = {}

    def parse(self) -> dict[str, TerraformVariable]:
        """Parse the variables.tf file and return a dictionary of TerraformVariable objects"""
        try:
            with open(self.file_path, encoding="utf-8") as file:
                hcl_content = file.read()

            # Parse HCL content
            parsed = hcl2.loads(hcl_content)

            # Extract variables - python-hcl2 returns variables as a list of dictionaries
            if "variable" in parsed:
                variables_list = parsed["variable"]
                if isinstance(variables_list, list):
                    # Each item in the list is a dictionary with one key (the variable name)
                    for var_dict in variables_list:
                        for var_name, var_def in var_dict.items():
                            self.variables[var_name] = TerraformVariable(
                                var_name, var_def
                            )
                else:
                    # Handle the case where it's a single dictionary
                    for var_name, var_def in variables_list.items():
                        self.variables[var_name] = TerraformVariable(var_name, var_def)

            return self.variables

        except Exception as e:
            print(f"Error parsing {self.file_path}: {e}")
            return {}

    def get_variable(self, name: str) -> TerraformVariable | None:
        """Get a specific variable by name"""
        return self.variables.get(name)

    def list_variables(self) -> list[str]:
        """Get a list of all variable names"""
        return list(self.variables.keys())

    def to_json(self, indent: int = 2) -> str:
        """Convert all variables to JSON format"""
        variables_dict = {name: var.to_dict() for name, var in self.variables.items()}
        return json.dumps(variables_dict, indent=indent, default=str)

    def to_yaml(self, default_flow_style: bool = False) -> str:
        """Convert all variables to YAML format"""
        import yaml

        variables_dict = {name: var.to_dict() for name, var in self.variables.items()}
        return yaml.dump(
            variables_dict, default_flow_style=default_flow_style, sort_keys=True
        )

    def to_harness(self, template_name: str = "terraform-template", **kwargs) -> str:
        """Convert all variables to Harness IDP template format

        Args:
            template_name: Name for the template
            **kwargs: Additional template options
                - title: Template title (default: generated from template_name)
                - description: Template description
                - tags: List of tags for the template
                - owner: Template owner/team

        Returns:
            YAML string formatted for Harness Software Template
        """
        import yaml

        # Template metadata
        title = kwargs.get("title", template_name.replace("-", " ").title())
        description = kwargs.get("description", f"Template for {title}")
        tags = kwargs.get("tags", ["terraform", "infrastructure"])
        owner = kwargs.get("owner", "platform-team")

        # Convert Terraform variables to Harness parameters
        parameters = []
        for name, var in self.variables.items():
            param = self._terraform_var_to_harness_param(name, var)
            if param:
                parameters.append(param)

        # Build the complete Harness template
        harness_template = {
            "apiVersion": "scaffolder.backstage.io/v1beta3",
            "kind": "Template",
            "metadata": {
                "name": template_name,
                "title": title,
                "description": description,
                "tags": tags,
            },
            "spec": {
                "owner": owner,
                "type": "service",
                "parameters": [
                    {
                        "title": "Resource Configuration",
                        "required": ["resources"],
                        "properties": {
                            "resources": {
                                "title": "Terraform Resources",
                                "description": "Configuration for all Terraform resources",
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        param["name"]: param["spec"]
                                        for param in parameters
                                    },
                                },
                                "default": (
                                    [
                                        {
                                            param["name"]: param["spec"].get("default")
                                            for param in parameters
                                            if param["spec"].get("default") is not None
                                        }
                                    ]
                                    if any(
                                        param["spec"].get("default") is not None
                                        for param in parameters
                                    )
                                    else [{}]
                                ),
                                "minItems": 1,
                            }
                        },
                    }
                ],
                "steps": [
                    {
                        "id": "fetch-base",
                        "name": "Fetch Base",
                        "action": "fetch:template",
                        "input": {
                            "url": "./content",
                            "values": {"data": "${{ parameters.resources }}"},
                        },
                    },
                    {
                        "id": "publish",
                        "name": "Publish",
                        "action": "publish:github",
                        "input": {
                            "allowedHosts": ["github.com"],
                            "description": "This is ${{ parameters.name }}",
                            "repoUrl": "${{ parameters.repoUrl }}",
                        },
                    },
                    {
                        "id": "register",
                        "name": "Register",
                        "action": "catalog:register",
                        "input": {
                            "repoContentsUrl": "${{ steps.publish.output.repoContentsUrl }}",
                            "catalogInfoPath": "/catalog-info.yaml",
                        },
                    },
                ],
            },
        }

        return yaml.dump(harness_template, default_flow_style=False, sort_keys=False)

    def _terraform_var_to_harness_param(self, name: str, var) -> dict[str, Any]:
        """Convert a Terraform variable to a Harness parameter specification"""
        param_spec: dict[str, Any] = {
            "title": var.description or name.replace("_", " ").title(),
            "description": var.description or f"Configuration for {name}",
        }

        # Map Terraform types to Harness UI schemas
        terraform_type = None
        if hasattr(var, "type") and var.type:
            terraform_type = var.type

            # Handle optional types first
            if isinstance(terraform_type, OptionalType):
                # Get the parameter spec for the inner type
                inner_param = self._get_harness_param_for_type(
                    terraform_type.inner_type, name
                )
                param_spec.update(inner_param)

                # Add default value if the optional type has one
                if terraform_type.has_default:
                    param_spec["default"] = terraform_type.default_value

            # Handle primitive types
            elif isinstance(terraform_type, PrimitiveType):
                if terraform_type.type_name == "string":
                    param_spec["type"] = "string"
                elif terraform_type.type_name == "number":
                    param_spec["type"] = "number"
                elif terraform_type.type_name == "bool":
                    param_spec["type"] = "boolean"
                    param_spec["ui:widget"] = "radio"
                    param_spec["ui:options"] = {"inline": True}

            # Handle complex types
            elif isinstance(terraform_type, ListType):
                param_spec["type"] = "array"
                param_spec["ui:widget"] = "textarea"
                param_spec["ui:help"] = "Enter one item per line"

                # Try to determine array item type
                if isinstance(terraform_type.element_type, PrimitiveType):
                    if terraform_type.element_type.type_name == "string":
                        param_spec["items"] = {"type": "string"}
                    elif terraform_type.element_type.type_name == "number":
                        param_spec["items"] = {"type": "number"}
                    elif terraform_type.element_type.type_name == "bool":
                        param_spec["items"] = {"type": "boolean"}
                elif isinstance(terraform_type.element_type, ObjectType):
                    # For list(object), create items schema
                    items_spec: dict[str, Any] = {"type": "object", "properties": {}}

                    # Add properties for the object items
                    for (
                        field_name,
                        field_type,
                    ) in terraform_type.element_type.attributes.items():
                        list_field_spec: dict[str, Any] = (
                            self._get_harness_param_for_type(
                                field_type, str(field_name)
                            )
                        )
                        list_field_spec["title"] = field_name.replace("_", " ").title()
                        items_spec["properties"][str(field_name)] = list_field_spec

                    param_spec["items"] = items_spec
                else:
                    # For other complex types, use object as default
                    param_spec["items"] = {"type": "object"}

            elif isinstance(terraform_type, SetType):
                param_spec["type"] = "array"
                param_spec["uniqueItems"] = True
                param_spec["ui:widget"] = "textarea"
                param_spec["ui:help"] = "Enter unique items, one per line"

            elif isinstance(terraform_type, MapType):
                param_spec["type"] = "object"
                param_spec["ui:widget"] = "textarea"
                param_spec["ui:help"] = "Enter key=value pairs, one per line"
                param_spec["ui:placeholder"] = "key1=value1\nkey2=value2"

                # Add additionalProperties for map value type
                if isinstance(terraform_type.value_type, PrimitiveType):
                    if terraform_type.value_type.type_name == "string":
                        param_spec["additionalProperties"] = {"type": "string"}
                    elif terraform_type.value_type.type_name == "number":
                        param_spec["additionalProperties"] = {"type": "number"}
                    elif terraform_type.value_type.type_name == "bool":
                        param_spec["additionalProperties"] = {"type": "boolean"}
                else:
                    # For complex value types, use object as default
                    param_spec["additionalProperties"] = {"type": "object"}

            elif isinstance(terraform_type, ObjectType):
                param_spec["type"] = "object"
                param_spec["properties"] = {}

                # Convert object fields to properties using the helper method
                for field_name, field_type in terraform_type.attributes.items():
                    nested_field_spec: dict[str, Any] = {
                        "title": field_name.replace("_", " ").title()
                    }

                    # Use the helper method to properly handle all types including OptionalType
                    type_spec = self._get_harness_param_for_type(
                        field_type, str(field_name)
                    )
                    nested_field_spec.update(type_spec)

                    param_spec["properties"][str(field_name)] = nested_field_spec

            else:
                # Fallback for unknown types
                param_spec["type"] = "string"
                param_spec["ui:widget"] = "textarea"
                param_spec["ui:help"] = f"Complex type: {terraform_type}"

        else:
            # No type specified, default to string
            param_spec["type"] = "string"

        # Add default value if present
        if var.default is not None:
            param_spec["default"] = var.default

        # Handle sensitive variables
        if hasattr(var, "sensitive") and var.sensitive:
            param_spec["ui:widget"] = "password"

        # Add validation constraints if present
        if hasattr(var, "validation") and var.validation:
            # Convert Terraform validation to JSON Schema constraints
            for validation in var.validation:
                if isinstance(validation, dict) and "condition" in validation:
                    # This is a simplified mapping - could be expanded
                    condition = str(validation["condition"])

                    # Import re module for pattern matching
                    import re

                    # Extract enum values from contains() validation
                    if "contains(" in condition:
                        # Handle both simple and complex contains patterns
                        # Simple: contains([val1, val2], var.name)
                        # Complex: length([for x in var.name : contains([val1, val2], x)]) == length(var.name)
                        try:
                            # First, try to find the most specific contains() call that has an array
                            contains_matches = re.finditer(
                                r"contains\(\s*(\[[^\]]+\])", condition
                            )

                            for match in contains_matches:
                                array_str = match.group(1)

                                # Parse the array string to extract values
                                # Extract both quoted strings and unquoted identifiers
                                quoted_matches = re.findall(r'"([^"]*)"', array_str)
                                unquoted_matches = re.findall(
                                    r"\b([A-Za-z][A-Za-z0-9_-]*)\b", array_str
                                )

                                # Use quoted matches if available, otherwise unquoted
                                values = (
                                    quoted_matches
                                    if quoted_matches
                                    else unquoted_matches
                                )

                                if values:
                                    # For array types, add enum constraint to items
                                    if isinstance(terraform_type, ListType | SetType):
                                        if "items" not in param_spec:
                                            param_spec["items"] = {}
                                        param_spec["items"]["enum"] = values
                                    else:
                                        # For scalar types, add enum constraint directly
                                        param_spec["enum"] = values
                                        param_spec["ui:widget"] = "select"
                                    break  # Use the first valid enum we find
                        except (ValueError, IndexError, re.error):
                            pass

                    elif "length(" in condition:
                        # Extract length constraints from conditions like:
                        # - length(var.name) > 5 && length(var.name) < 16
                        # - (length(var.name) > 0 && length(var.name) < 13)
                        try:
                            # Parse various length constraint patterns
                            import re

                            # Pattern for length(var.name) > N or length(var.name) >= N
                            min_matches = re.findall(
                                r"length\([^)]+\)\s*(>=?)\s*(\d+)", condition
                            )
                            # Pattern for length(var.name) < N or length(var.name) <= N
                            max_matches = re.findall(
                                r"length\([^)]+\)\s*(<=?)\s*(\d+)", condition
                            )

                            for operator, value in min_matches:
                                min_val = int(value)
                                # Ensure non-negative values only
                                if min_val < 0:
                                    continue

                                # For > operator, minimum is value + 1
                                # For >= operator, minimum is value
                                if operator == ">":
                                    param_spec["minLength"] = max(0, min_val + 1)
                                else:  # '>='
                                    param_spec["minLength"] = max(0, min_val)

                            for operator, value in max_matches:
                                max_val = int(value)
                                # Ensure non-negative values only
                                if max_val < 0:
                                    continue

                                # For < operator, maximum is value - 1
                                # For <= operator, maximum is value
                                if operator == "<":
                                    param_spec["maxLength"] = max(0, max_val - 1)
                                else:  # '<='
                                    param_spec["maxLength"] = max(0, max_val)

                        except (ValueError, IndexError, re.error):
                            # If length parsing fails, fall back to basic defaults
                            if ">" in condition or ">=" in condition:
                                param_spec["minLength"] = 1
                            if "<" in condition or "<=" in condition:
                                param_spec["maxLength"] = 100

                    elif "can(regex(" in condition:
                        # Extract regex pattern from can(regex("pattern", var.name)) validation
                        try:
                            # Find the regex pattern between quotes
                            regex_match = re.search(r'can\(regex\("([^"]*)"', condition)
                            if regex_match:
                                regex_pattern = regex_match.group(1)
                                # Convert Terraform regex to JSON Schema pattern
                                # Note: This is a basic conversion - more complex patterns may need additional handling
                                param_spec["pattern"] = regex_pattern

                                # Add a description hint about the pattern
                                if "description" not in param_spec:
                                    param_spec["description"] = (
                                        f"Must match pattern: {regex_pattern}"
                                    )

                        except (ValueError, IndexError, re.error):
                            # If regex parsing fails, skip this validation
                            pass
                    elif "var." + name in condition and "number" in str(terraform_type):
                        # Extract numeric constraints
                        if ">=" in condition:
                            try:
                                min_val = int(condition.split(">=")[1].split()[0])
                                param_spec["minimum"] = min_val
                            except (ValueError, IndexError):
                                pass
                        if "<=" in condition:
                            try:
                                max_val = int(condition.split("<=")[1].split()[0])
                                param_spec["maximum"] = max_val
                            except (ValueError, IndexError):
                                pass

        # Add enum options for common string patterns
        if (
            terraform_type is not None
            and isinstance(terraform_type, PrimitiveType)
            and terraform_type.type_name == "string"
            and ("environment" in name.lower() or "env" in name.lower())
        ):
            param_spec["enum"] = ["dev", "staging", "prod"]
            param_spec["ui:widget"] = "select"

        return {"name": name, "spec": param_spec}

    def _get_harness_param_for_type(
        self, terraform_type: TerraformType, name: str
    ) -> dict[str, Any]:
        """Get Harness parameter specification for a given Terraform type."""
        param_spec: dict[str, Any] = {}

        # Handle primitive types
        if isinstance(terraform_type, PrimitiveType):
            if terraform_type.type_name == "string":
                param_spec["type"] = "string"
            elif terraform_type.type_name == "number":
                param_spec["type"] = "number"
            elif terraform_type.type_name == "bool":
                param_spec["type"] = "boolean"
                param_spec["ui:widget"] = "radio"
                param_spec["ui:options"] = {"inline": True}

        # Handle complex types
        elif isinstance(terraform_type, ListType):
            param_spec["type"] = "array"
            param_spec["ui:widget"] = "textarea"
            param_spec["ui:help"] = "Enter one item per line"

            # Try to determine array item type
            if isinstance(terraform_type.element_type, PrimitiveType):
                if terraform_type.element_type.type_name == "string":
                    param_spec["items"] = {"type": "string"}
                elif terraform_type.element_type.type_name == "number":
                    param_spec["items"] = {"type": "number"}
                elif terraform_type.element_type.type_name == "bool":
                    param_spec["items"] = {"type": "boolean"}
            elif isinstance(terraform_type.element_type, ObjectType):
                # For list(object), create items schema
                items_spec: dict[str, Any] = {"type": "object", "properties": {}}

                # Add properties for the object items
                for (
                    field_name,
                    field_type,
                ) in terraform_type.element_type.attributes.items():
                    object_field_spec: dict[str, Any] = (
                        self._get_harness_param_for_type(field_type, str(field_name))
                    )
                    object_field_spec["title"] = field_name.replace("_", " ").title()
                    items_spec["properties"][str(field_name)] = object_field_spec

                param_spec["items"] = items_spec
            else:
                # For other complex types, use object as default
                param_spec["items"] = {"type": "object"}

        elif isinstance(terraform_type, SetType):
            param_spec["type"] = "array"
            param_spec["uniqueItems"] = True
            param_spec["ui:widget"] = "textarea"
            param_spec["ui:help"] = "Enter unique items, one per line"

        elif isinstance(terraform_type, MapType):
            param_spec["type"] = "object"
            param_spec["ui:widget"] = "textarea"
            param_spec["ui:help"] = "Enter key=value pairs, one per line"
            param_spec["ui:placeholder"] = "key1=value1\nkey2=value2"

            # Add additionalProperties for map value type
            if isinstance(terraform_type.value_type, PrimitiveType):
                if terraform_type.value_type.type_name == "string":
                    param_spec["additionalProperties"] = {"type": "string"}
                elif terraform_type.value_type.type_name == "number":
                    param_spec["additionalProperties"] = {"type": "number"}
                elif terraform_type.value_type.type_name == "bool":
                    param_spec["additionalProperties"] = {"type": "boolean"}
            else:
                # For complex value types, use object as default
                param_spec["additionalProperties"] = {"type": "object"}

        elif isinstance(terraform_type, ObjectType):
            param_spec["type"] = "object"
            param_spec["properties"] = {}

            # Convert object fields to properties
            for field_name, field_type in terraform_type.attributes.items():
                obj_field_spec: dict[str, Any] = {
                    "title": field_name.replace("_", " ").title()
                }

                # Recursively handle nested types, including OptionalType
                nested_param = self._get_harness_param_for_type(
                    field_type, str(field_name)
                )
                obj_field_spec.update(nested_param)

                param_spec["properties"][str(field_name)] = obj_field_spec

        elif isinstance(terraform_type, OptionalType):
            # For nested OptionalType, get the inner type specification
            inner_param = self._get_harness_param_for_type(
                terraform_type.inner_type, name
            )
            param_spec.update(inner_param)

            # Add default value if the optional type has one
            if terraform_type.has_default:
                param_spec["default"] = terraform_type.default_value

        else:
            # Fallback for unknown types
            param_spec["type"] = "string"
            param_spec["ui:widget"] = "textarea"
            param_spec["ui:help"] = f"Complex type: {terraform_type}"

        return param_spec

    def to_format(self, output_format: str, **kwargs) -> str:
        """Convert all variables to specified format

        Args:
            output_format: 'json', 'yaml', or 'harness'
            **kwargs: Format-specific arguments

        Returns:
            Formatted string representation
        """
        if output_format.lower() == "json":
            return self.to_json(**kwargs)
        elif output_format.lower() == "yaml":
            return self.to_yaml(**kwargs)
        elif output_format.lower() == "harness":
            return self.to_harness(**kwargs)
        else:
            raise ValueError(
                f"Unsupported format: {output_format}. Use 'json', 'yaml', or 'harness'"
            )


def generate_multi_building_block_harness(building_blocks: dict[str, Any]) -> str:
    """Generate a comprehensive Harness IDP template for multiple building blocks.

    Args:
        building_blocks: Dict with building block names as keys and dict with
                        'parser', 'variables', 'path' as values

    Returns:
        Complete Harness IDP YAML template as string
    """
    import yaml

    # Extract building block names for the enum
    bb_names = sorted(building_blocks.keys())

    # Generate base template structure
    template = {
        "apiVersion": "scaffolder.backstage.io/v1beta3",
        "kind": "Template",
        "metadata": {
            "name": "terraform-building-blocks-template",
            "title": "Terraform Building Blocks Template",
            "description": "Template for provisioning cloud infrastructure using Terraform Building Blocks",
            "tags": ["terraform", "infrastructure", "building-blocks"],
        },
        "spec": {
            "owner": "platform-team",
            "type": "service",
            "parameters": [
                {
                    "title": "Resource Configuration",
                    "required": ["resources"],
                    "properties": {
                        "resources": {
                            "title": "Terraform Resources",
                            "description": "Configuration for all Terraform resources",
                            "type": "array",
                            "items": {
                                "type": "object",
                                "description": "Choose from one of the available Terraform Building Blocks",
                                "required": ["resource"],
                                "properties": {
                                    "resource": {"type": "string", "enum": bb_names}
                                },
                                "dependencies": {"resource": {"oneOf": []}},
                            },
                            "minItems": 1,
                        }
                    },
                }
            ],
            "steps": [
                {
                    "id": "fetch-base",
                    "name": "Fetch Base",
                    "action": "fetch:template",
                    "input": {
                        "url": "./content",
                        "values": {"data": "${{ parameters.resources }}"},
                    },
                },
                {
                    "id": "publish",
                    "name": "Publish",
                    "action": "publish:github",
                    "input": {
                        "allowedHosts": ["github.com"],
                        "description": "This is ${{ parameters.name }}",
                        "repoUrl": "${{ parameters.repoUrl }}",
                    },
                },
                {
                    "id": "register",
                    "name": "Register",
                    "action": "catalog:register",
                    "input": {
                        "repoContentsUrl": "${{ steps.publish.output.repoContentsUrl }}",
                        "catalogInfoPath": "/catalog-info.yaml",
                    },
                },
            ],
        },
    }

    # Generate dependencies for each building block
    # Create dependencies list that will be populated
    dependencies_list: list[dict[str, Any]] = []
    building_block_definitions: dict[str, Any] = {}

    for bb_name, bb_data in building_blocks.items():
        # Generate definition for this building block
        variables = bb_data["variables"]
        parser = bb_data["parser"]

        # Create the building block definition
        required_fields: list[str] = []
        properties: dict[str, Any] = {}

        definition = {
            "title": f"{bb_name} Building Block",
            "type": "object",
            "description": f"Configuration for {bb_name} Terraform Building Block",
            "required": required_fields,
            "properties": properties,
        }

        # Add variables as properties
        for var_name, variable in variables.items():
            param_spec = parser._terraform_var_to_harness_param(var_name, variable)[
                "spec"
            ]
            properties[var_name] = param_spec

            # Add to required if no default value
            if variable.default is None and not variable.nullable:
                required_fields.append(var_name)

        # Store the definition
        building_block_definitions[bb_name] = {"definition": definition}

        # Add to dependencies oneOf list
        dependencies_list.append(
            {
                "properties": {
                    "resource": {"enum": [bb_name]},
                    "version": {
                        "type": "string",
                        "ui:readonly": True,
                        "default": "1.0.0",
                        "description": "Building block version",
                    },
                    "definition": {"$ref": f"#/{bb_name}/definition"},
                }
            }
        )

    # Assign the populated dependencies list to the template
    # Use type ignore to bypass mypy's inference issue with deep nested dict access
    template["spec"]["parameters"][0]["properties"]["resources"]["items"][  # type: ignore
        "dependencies"
    ]["resource"]["oneOf"] = dependencies_list

    # Add building block definitions to the template
    template.update(building_block_definitions)

    # Convert to YAML
    return yaml.dump(
        template, default_flow_style=False, sort_keys=False, allow_unicode=True
    )
