
class Presenters:
  @staticmethod
  def technology(item):
    return {
      'description': item['description'],
      'origins': item['origins'],
      'technology': item['technology'],
      'category': item['category']
    }
