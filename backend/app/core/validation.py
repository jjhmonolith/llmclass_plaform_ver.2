"""
JSON Schema validation utilities
"""
import jsonschema
from typing import Dict, Any, List, Tuple
from app.schemas.templates import ValidationError


def validate_settings_against_schema(settings: Dict[str, Any], schema: Dict[str, Any]) -> Tuple[bool, List[ValidationError]]:
    """
    Validate settings JSON against mode schema
    
    Args:
        settings: Settings to validate
        schema: JSON schema to validate against
        
    Returns:
        Tuple of (is_valid, list_of_errors)
    """
    errors = []
    
    try:
        jsonschema.validate(settings, schema)
        return True, []
    except jsonschema.ValidationError as e:
        # Convert jsonschema error to our error format
        path = ".".join(str(p) for p in e.absolute_path) if e.absolute_path else "root"
        error = ValidationError(
            path=path,
            message=e.message
        )
        errors.append(error)
        return False, errors
    except jsonschema.SchemaError as e:
        # Schema itself is invalid
        error = ValidationError(
            path="schema",
            message=f"Invalid schema: {e.message}"
        )
        errors.append(error)
        return False, errors
    except Exception as e:
        # Any other validation error
        error = ValidationError(
            path="unknown",
            message=f"Validation error: {str(e)}"
        )
        errors.append(error)
        return False, errors


def get_required_fields_from_schema(schema: Dict[str, Any]) -> List[str]:
    """
    Extract required field names from JSON schema
    
    Args:
        schema: JSON schema
        
    Returns:
        List of required field names
    """
    return schema.get("required", [])