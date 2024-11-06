# from .crud_polygons import (
#     create_polygon,
#     get_polygons,
#     update_polygon,
#     delete_polygon,
# )

# from .crud_images import (
#     create_image,
#     get_image_by_id,
#     update_annotated_png_s3_key,
#     delete_image,
#     get_image_by_filename,
#     get_polygons_within_bounds,
#     create_analysis_result,
#     create_cropped_image
# )

from .crud_polygons import *
from .crud_images import *


# import pkgutil
# import importlib

# # Automatically import all modules in the current package
# for module_info in pkgutil.iter_modules(__path__):
#     module = importlib.import_module(f"{__name__}.{module_info.name}")
#     for name in dir(module):
#         if not name.startswith('_'):
#             globals()[name] = getattr(module, name)