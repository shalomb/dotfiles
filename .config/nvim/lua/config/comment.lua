local ft = require('Comment.ft')

-- 1. Using set function

ft
-- Set only line comment
    .set('yaml', '#%s')

-- Or set both line and block commentstring
    .set('javascript', { '//%s', '/*%s*/' })

-- Or set both line and block commentstring
    .set('terraform', { '//%s', '//%s' })
