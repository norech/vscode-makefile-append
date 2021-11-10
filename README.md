# Makefile Append

Makefile Append extension will allow you to simply append current file to the variable of your choice in the Makefile of your choice. Simply. It is aimed to reduce frustration of adding new files in a project using Makefiles.

## Features

- Provide a command to append current file to a Makefile, resolving the relative path between them.
  - The Makefile can be chosen if there are several Makefiles in the project
  - The variable where you might append the file path into can be chosen

## Known Issues

This extension can only detect Makefile variables containing only files ending with .c, .h, .cpp and .hpp.

In other cases, it is possible that it detect these variables, but the changes applies to the Makefile might contain errors. Make sure that the variable only contains these files for the best behaviour.

This extension will not sort the appended file paths.