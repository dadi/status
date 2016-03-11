# DADI Status

## Overview

It is part of DADI, a suite of components covering the full development stack, built for performance and scale.

## Usage

```
var dadiStatus = require('@dadi/status');

var params = {
	version: 'x.x.x',
	requestLink: 'http://127.0.0.1:3000',
	authorization: 'Bearer 123abcdef',
	healthRoutes: [],
	healthTimeLimit: 100,
	pkgName: '@dadi/api'
};
dadiStatus(params, function(error, data) {
	console.log(data);
});
```

## Licence

Copyright notice<br />
(C) 2016 DADI+ Limited <support@dadi.tech><br />
All rights reserved

This product is part of DADI.<br />
DADI is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as
published by the Free Software Foundation; either version 2 of
the License, or (at your option) any later version ("the GPL").
**If you wish to use DADI outside the scope of the GPL, please
contact us at info@dadi.co for details of alternative licence
arrangements.**

**This product may be distributed alongside other components
available under different licences (which may not be GPL). See
those components themselves, or the documentation accompanying
them, to determine what licences are applicable.**

DADI is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

The GNU General Public License (GPL) is available at
http://www.gnu.org/copyleft/gpl.html.<br />
A copy can be found in the file GPL distributed with
these files.

This copyright notice MUST APPEAR in all copies of the product!
