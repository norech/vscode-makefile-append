# Makefile Append

Makefile Append extension will allow you to simply append current file to the variable of your choice in the Makefile or CMakeLists.txt file of your choice. Simply. It is aimed to reduce frustration of adding new files in a project using Makefiles or CMakeLists.txt files.

## Features

- Provide a command to append current file to a Makefile, resolving the relative path between them.
  - The Makefile can be chosen if there are several Makefiles in the project
  - The variable where you might append the file path into can be chosen
  - Ctrl + Shift + P -> `Makefile Append: Append current file to Makefile`

- Provide a command to append current file to a CMakeLists.txt file, resolving the relative path between them.
  - The CMakeLists.txt file can be chosen if there are several CMakeLists.txt files in the project
  - The variable where you might append the file path into can be chosen
  - Ctrl + Shift + P -> `Makefile Append: Append current file to CMakeLists.txt`

## Known Issues

This extension can only detect Makefile and CMakeLists.txt file variables containing only files ending with .c, .h, .cpp and .hpp.

In other cases, it is possible that it detect these variables, but the changes applied to the Makefile or the CMakeLists.txt file might contain errors. Make sure that the variable only contains these files for the best behaviour.

This extension will not sort the appended file paths.